// SPDX-License-Identifier: MIT
// COPYRIGHT cVault.finance TEAM
// COPYRIGHT ARM Finance LLC
pragma solidity ^0.7.0;
pragma abicoder v2;

import "./lib/ContextUpgradeSafe.sol";

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

/**
 * @notice ERC95 is a token wrapping standard for one or more underlying ERC20 tokens
 *
 * It could wrap a single fungible token (e.g. YFI) or any combination of underlying tokens (e.g. 25% YFI 10% DAI 10% WETH 55% X).
 * Once wrapped, balances are immutable. These wrappers should be composable and wrappable themselves.
 *
 * Wrapped tokens naming conventions ought to be: armA for token A (i.e. 25 armA + 25 armB+ 50 armC)
 * LP wrapped tokens naming conventions ought to be: 0.1 lparmA + 5 lparmB + 25 lparmC
 * Leveraged multiplier tokens naming conventions ought to be: x25armA + x50armB
 *
 * Where: arm for ARM token wraps, x for times (leverage), lp for Liquidity Pools tokens.
 *
 * @dev A token wrapping standard
 * @dev Recieves token A, issues armA
 * @dev eg. YFI -> armYFI
 * @dev Unwrapping and wrapping should be fee-less and permissionless the same principles as WETH
 */
contract ERC95 is ContextUpgradeSafe, IERC20 {
	using SafeMath for uint256;
	using SafeMath for uint8;

	event Wrapped(address indexed from, address indexed to, uint256 amount);
	event Unwrapped(address indexed from, address indexed to, uint256 amount);

	uint8 public _numTokensWrapped;
	WrappedToken[] public _wrappedTokens;

	struct WrappedToken {
		address _address;
		uint256 _reserve;
		uint256 _amountWrapperPerUnit;
	}

	function _setName(string memory __name) internal {
		_name = __name;
	}

	function __ERC95_init(
		string memory __name,
		string memory __symbol,
		address[] memory _addresses,
		uint8[] memory _percent,
		uint8[] memory tokenDecimals
	) public initializer {
		ContextUpgradeSafe.__Context_init_unchained();
		// check whether numbers were supplied 1:1 and size their proportions.
		require(_addresses.length == _percent.length, "ERC95::initializer: Tokens numbers mismatch");

		uint8 decimalsMax;
		uint256 percentTotal; // Counter field to make sure underlying tokens add up to 100% of the total
		uint8 numTokensWrapped = 0;
		for (uint256 loop = 0; loop < _addresses.length; loop++) {
			// <1% tokens are not to be permitted
			require(_percent[loop] > 0, "ERC95::initializer: Any wrapped token must represent at least 1% of basket");

			// we establish the decimals for the current looped token (token decimals are not part of the ERC20 standard)
			decimalsMax = tokenDecimals[loop] > decimalsMax ? tokenDecimals[loop] : decimalsMax;
			// further sanity-checking that everything adds up
			percentTotal += _percent[loop];
			numTokensWrapped++;
		}

		require(percentTotal == 100, "ERC95::initializer: Percent of all wrapped tokens should equal 100%");
		// Sanity check
		require(numTokensWrapped == _addresses.length, "ERC95::initializer: Wrapped tokens lengths mismatch");
		_numTokensWrapped = numTokensWrapped;

		// Cycle over all tokens against to populate the structs
		for (uint256 loop = 0; loop < numTokensWrapped; loop++) {
			// we calculate the difference between decimals as 6-decimals token should have 1000000000000000000 in 18-decimals token per unit
			uint256 decimalDifference = decimalsMax - tokenDecimals[loop]; // 10 ** 0 = 1, good
			// cast to SafeMath
			console.log("Decimal difference", decimalDifference);
			console.log("Percent loop", _percent[loop]);
			console.log("10 ** decimal diff", 10**decimalDifference);
			uint256 pAmountWrapperPerUnit = numTokensWrapped > 1 ? (10**decimalDifference).mul(_percent[loop]) : 1;
			console.log("Adding wrapped tokens with pAmountWrapperPerUnit: ", pAmountWrapperPerUnit);
			_wrappedTokens.push(
				WrappedToken({
					_address: _addresses[loop],
					_reserve: 0, /* TODO: Establish what the reserve does, for now just stick 0 in it */
					_amountWrapperPerUnit: pAmountWrapperPerUnit // if its one token then we can have the same decimals
					/// 10 * 0 = 1 * 1 = 1
					/// 10 * 0 = 1 * 50 = 50 this means half because +2 decimals
				})
			);
		}

		_name = __name;
		_symbol = __symbol;
		// case 1: we dont need more decimals if its only 1 token wraped
		// case 2: more decimals to support percentage wraps as we support up to 1%-100% in integers
		_decimals = numTokensWrapped > 1 ? decimalsMax + 2 : decimalsMax;
	}

	// Returns info for a token with x id in the loop
	function getTokenInfo(uint256 _id)
		public
		view
		returns (
			address,
			uint256,
			uint256
		)
	{
		WrappedToken memory wt = _wrappedTokens[_id];
		return (wt._address, wt._reserve, wt._amountWrapperPerUnit);
	}

	// Mints the ERC20 during a wrap
	function _mintWrap(address to, uint256 amt) internal {
		console.log("ERC95::_mintWrap: _totalSupply before mint: ", _totalSupply);
		_mint(to, amt);
		console.log("ERC95::_mintWrap: _totalSupply after mint: ", _totalSupply);
		emit Wrapped(msg.sender, to, amt);
	}

	// Burns the wrapper token and sends back the underlying tokens
	function _unwrap(
		address from,
		address to,
		uint256 amt
	) internal {
		_burn(from, amt);
		sendUnderlyingTokens(to, amt);
		emit Unwrapped(from, to, amt);
	}

	// Public function to unwrap
	function unwrap(uint256 amt) public {
		_unwrap(msg.sender, msg.sender, amt);
	}

	// Public function to unwrap all
	function unwrapAll() public {
		unwrap(_balances[msg.sender]);
	}

	// TODO: Use the vanilla SafeTransfer methods from Uniswap
	// TODO: Account for decimals in transfer amt
	function sendUnderlyingTokens(address to, uint256 amt) internal {
		for (uint256 loop = 0; loop < _numTokensWrapped; loop++) {
			WrappedToken storage currentToken = _wrappedTokens[loop];
			uint256 amtToSend = amt.mul(currentToken._amountWrapperPerUnit);
			safeTransfer(currentToken._address, to, amtToSend);
			currentToken._reserve = currentToken._reserve.sub(amtToSend);
		}
	}

	function safeTransfer(
		address token,
		address to,
		uint256 value
	) internal {
		// bytes4(keccak256(bytes('transfer(address,uint256)')));
		(bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
		require(success && (data.length == 0 || abi.decode(data, (bool))), "ERC95::safeTransfer: TRANSFER_FAILED");
	}

	function safeTransferFrom(
		address token,
		address from,
		address to,
		uint256 value
	) internal {
		// bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
		(bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
		require(
			success && (data.length == 0 || abi.decode(data, (bool))),
			"ERC95::safeTransferFrom: TRANSFER_FROM_FAILED"
		);
	}

	// You can unwrap if you have enough allowance in the underlying ERC20 token
	function unwrapFor(address spender, uint256 amt) public {
		require(_allowances[spender][msg.sender] >= amt, "ERC95::unwrapFor: allowance excedeed");
		_unwrap(spender, msg.sender, amt);
		_allowances[spender][msg.sender] = _allowances[spender][msg.sender].sub(amt);
	}

	// Cycles over all tokens in the wrap and deposits them with allowance
	function _depositUnderlying(uint256 amt) internal {
		for (uint256 loop = 0; loop < _numTokensWrapped; loop++) {
			WrappedToken memory currentToken = _wrappedTokens[loop];
			// req successful transfer
			uint256 amtToSend = amt.mul(currentToken._amountWrapperPerUnit);
			safeTransferFrom(currentToken._address, msg.sender, address(this), amtToSend);
			// transfer went OK so we may add its corresponding balance to reserve
			_wrappedTokens[loop]._reserve = currentToken._reserve.add(amtToSend);
		}
	}

	// Deposits after checking against reserves
	function wrapAtomic(address to) public noNullAddress(to) {
		console.log("ERC95::wrapAtomic: minting to ", to);
		uint256 amt = _updateReserves();
		console.log("ERC95::wrapAtomic: mint amount: ", amt);
		_mintWrap(to, amt);
	}

	// Public function to deposit (with allowance) and mint the corresponding wrap
	function wrap(address to, uint256 amt) public noNullAddress(to) {
		// works as wrap for
		_depositUnderlying(amt);
		_mintWrap(to, amt); // no need to check underlying?
	}

	// Safety check for front end bugs
	modifier noNullAddress(address to) {
		require(to != address(0), "ERC95::noNullAddress: null address safety check");
		_;
	}

	function _updateReserves() internal returns (uint256 qtyOfNewTokens) {
		// cycle through all wrapped tokens and find the maximum quantity of new wrapped tokens that can be created, given the balance delta for this block
		console.log("ERC95::_updateReserves: _numTokensWrapped: ", _numTokensWrapped);
		for (uint256 loop = 0; loop < _numTokensWrapped; loop++) {
			WrappedToken memory currentToken = _wrappedTokens[loop];
			uint256 currentTokenBal = IERC20(currentToken._address).balanceOf(address(this));
			console.log("ERC95::_updateReserves: currentTokenBal inside loop: ", currentTokenBal, currentToken._address);
			console.log(
				"ERC95::_updateReserves: currentToken._amountWrapperPerUnit: ",
				currentToken._amountWrapperPerUnit
			);
			// TODO: update to avoid using percentages
			uint256 amtCurrent = currentTokenBal.sub(currentToken._reserve).div(currentToken._amountWrapperPerUnit); // safe math check
			console.log("ERC95::_updateReserves: current amount: ", amtCurrent);
			qtyOfNewTokens = qtyOfNewTokens > amtCurrent ? amtCurrent : qtyOfNewTokens; // pick the lowest amount so dust attack doesn't work
			// can't skim in txs or they have non-deterministic gas price
			console.log("ERC95::_updateReserves: quantity of newly wrapped tokens: ", qtyOfNewTokens);
			if (loop == 0) {
				qtyOfNewTokens = amtCurrent;
			}
		}
		console.log("ERC95::_updateReserves: lowest common denominator for token mint: ", qtyOfNewTokens);
		// second loop assures that reserve numbers match the computed amounts
		for (uint256 loop2 = 0; loop2 < _numTokensWrapped; loop2++) {
			WrappedToken memory currentToken = _wrappedTokens[loop2];

			uint256 amtDelta = qtyOfNewTokens.mul(currentToken._amountWrapperPerUnit); // math check
			_wrappedTokens[loop2]._reserve = currentToken._reserve.add(amtDelta); // math check
		}
	}

	// Forces matching reserves by transferring out to anyone the excess
	function skim(address to) public {
		for (uint256 loop = 0; loop < _numTokensWrapped; loop++) {
			WrappedToken memory currentToken = _wrappedTokens[loop];
			uint256 currentTokenBal = IERC20(currentToken._address).balanceOf(address(this));
			uint256 excessTokensQuantity = currentTokenBal.sub(currentToken._reserve);
			if (excessTokensQuantity > 0) {
				safeTransfer(currentToken._address, to, excessTokensQuantity);
			}
		}
	}

	/// ERC20 implementation
	using SafeMath for uint256;

	mapping(address => uint256) private _balances;

	mapping(address => mapping(address => uint256)) private _allowances;

	uint256 private _totalSupply;

	string private _name;
	string private _symbol;
	uint8 private _decimals;

	/**
	 * @dev Returns the name of the token.
	 */
	function name() public view returns (string memory) {
		return _name;
	}

	/**
	 * @dev Returns the symbol of the token, usually a shorter version of the
	 * name.
	 */
	function symbol() public view returns (string memory) {
		return _symbol;
	}

	/**
	 * @dev Returns the number of decimals used to get its user representation.
	 * For example, if `decimals` equals `2`, a balance of `505` tokens should
	 * be displayed to a user as `5,05` (`505 / 10 ** 2`).
	 *
	 * Tokens usually opt for a value of 18, imitating the relationship between
	 * Ether and Wei. This is the value {ERC20} uses, unless {_setupDecimals} is
	 * called.
	 *
	 * NOTE: This information is only used for _display_ purposes: it in
	 * no way affects any of the arithmetic of the contract, including
	 * {IERC20-balanceOf} and {IERC20-transfer}.
	 */
	function decimals() public view returns (uint8) {
		return _decimals;
	}

	/**
	 * @dev See {IERC20-totalSupply}.
	 */
	function totalSupply() public view override returns (uint256) {
		return _totalSupply;
	}

	/**
	 * @dev See {IERC20-balanceOf}.
	 */
	function balanceOf(address account) public view override returns (uint256) {
		return _balances[account];
	}

	/**
	 * @dev See {IERC20-transfer}.
	 *
	 * Requirements:
	 *
	 * - `recipient` cannot be the zero address.
	 * - the caller must have a balance of at least `amount`.
	 */
	function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
		_transfer(_msgSender(), recipient, amount);
		return true;
	}

	/**
	 * @dev See {IERC20-allowance}.
	 */
	function allowance(address owner, address spender) public view virtual override returns (uint256) {
		return _allowances[owner][spender];
	}

	/**
	 * @dev See {IERC20-approve}.
	 *
	 * Requirements:
	 *
	 * - `spender` cannot be the zero address.
	 */
	function approve(address spender, uint256 amount) public virtual override returns (bool) {
		_approve(_msgSender(), spender, amount);
		return true;
	}

	/**
	 * @dev See {IERC20-transferFrom}.
	 *
	 * Emits an {Approval} event indicating the updated allowance. This is not
	 * required by the EIP. See the note at the beginning of {ERC20}.
	 *
	 * Requirements:
	 *
	 * - `sender` and `recipient` cannot be the zero address.
	 * - `sender` must have a balance of at least `amount`.
	 * - the caller must have allowance for ``sender``'s tokens of at least
	 * `amount`.
	 */
	function transferFrom(
		address sender,
		address recipient,
		uint256 amount
	) public virtual override returns (bool) {
		_transfer(sender, recipient, amount);
		_approve(
			sender,
			_msgSender(),
			_allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance")
		);
		return true;
	}

	/**
	 * @dev Atomically increases the allowance granted to `spender` by the caller.
	 *
	 * This is an alternative to {approve} that can be used as a mitigation for
	 * problems described in {IERC20-approve}.
	 *
	 * Emits an {Approval} event indicating the updated allowance.
	 *
	 * Requirements:
	 *
	 * - `spender` cannot be the zero address.
	 */
	function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
		_approve(_msgSender(), spender, _allowances[_msgSender()][spender].add(addedValue));
		return true;
	}

	/**
	 * @dev Atomically decreases the allowance granted to `spender` by the caller.
	 *
	 * This is an alternative to {approve} that can be used as a mitigation for
	 * problems described in {IERC20-approve}.
	 *
	 * Emits an {Approval} event indicating the updated allowance.
	 *
	 * Requirements:
	 *
	 * - `spender` cannot be the zero address.
	 * - `spender` must have allowance for the caller of at least
	 * `subtractedValue`.
	 */
	function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
		_approve(
			_msgSender(),
			spender,
			_allowances[_msgSender()][spender].sub(subtractedValue, "ERC20: decreased allowance below zero")
		);
		return true;
	}

	/**
	 * @dev Moves tokens `amount` from `sender` to `recipient`.
	 *
	 * This is internal function is equivalent to {transfer}, and can be used to
	 * e.g. implement automatic token fees, slashing mechanisms, etc.
	 *
	 * Emits a {Transfer} event.
	 *
	 * Requirements:
	 *
	 * - `sender` cannot be the zero address.
	 * - `recipient` cannot be the zero address.
	 * - `sender` must have a balance of at least `amount`.
	 */
	function _transfer(
		address sender,
		address recipient,
		uint256 amount
	) internal virtual {
		require(sender != address(0), "ERC20: transfer from the zero address");
		require(recipient != address(0), "ERC20: transfer to the zero address");

		_beforeTokenTransfer(sender, recipient, amount);

		_balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
		_balances[recipient] = _balances[recipient].add(amount);
		emit Transfer(sender, recipient, amount);
	}

	/** @dev Creates `amount` tokens and assigns them to `account`, increasing
	 * the total supply.
	 *
	 * Emits a {Transfer} event with `from` set to the zero address.
	 *
	 * Requirements:
	 *
	 * - `to` cannot be the zero address.
	 */
	function _mint(address account, uint256 amount) internal virtual {
		require(account != address(0), "ERC20: mint to the zero address");

		_beforeTokenTransfer(address(0), account, amount);

		_totalSupply = _totalSupply.add(amount);
		_balances[account] = _balances[account].add(amount);
		emit Transfer(address(0), account, amount);
	}

	/**
	 * @dev Destroys `amount` tokens from `account`, reducing the
	 * total supply.
	 *
	 * Emits a {Transfer} event with `to` set to the zero address.
	 *
	 * Requirements:
	 *
	 * - `account` cannot be the zero address.
	 * - `account` must have at least `amount` tokens.
	 */
	function _burn(address account, uint256 amount) internal virtual {
		require(account != address(0), "ERC20: burn from the zero address");

		_beforeTokenTransfer(account, address(0), amount);

		_balances[account] = _balances[account].sub(amount, "ERC20: burn amount exceeds balance");
		_totalSupply = _totalSupply.sub(amount);
		emit Transfer(account, address(0), amount);
	}

	/**
	 * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
	 *
	 * This internal function is equivalent to `approve`, and can be used to
	 * e.g. set automatic allowances for certain subsystems, etc.
	 *
	 * Emits an {Approval} event.
	 *
	 * Requirements:
	 *
	 * - `owner` cannot be the zero address.
	 * - `spender` cannot be the zero address.
	 */
	function _approve(
		address owner,
		address spender,
		uint256 amount
	) internal virtual {
		require(owner != address(0), "ERC20: approve from the zero address");
		require(spender != address(0), "ERC20: approve to the zero address");

		_allowances[owner][spender] = amount;
		emit Approval(owner, spender, amount);
	}

	/**
	 * @dev Sets {decimals} to a value other than the default one of 18.
	 *
	 * WARNING: This function should only be called from the constructor. Most
	 * applications that interact with token contracts will not expect
	 * {decimals} to ever change, and may work incorrectly if it does.
	 */
	function _setupDecimals(uint8 decimals_) internal {
		_decimals = decimals_;
	}

	/**
	 * @dev Hook that is called before any transfer of tokens. This includes
	 * minting and burning.
	 *
	 * Calling conditions:
	 *
	 * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
	 * will be to transferred to `to`.
	 * - when `from` is zero, `amount` tokens will be minted for `to`.
	 * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
	 * - `from` and `to` are never both zero.
	 *
	 * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
	 */
	function _beforeTokenTransfer(
		address from,
		address to,
		uint256 amount
	) internal virtual {}
}
