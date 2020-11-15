export function getFunctionSigs(_interface) {
    return Object.values(_interface.functions)
        .map(fragment => (
            {         // @ts-ignore
                name: fragment.name,
                sig: _interface.getSighash(fragment)
            }
        )
    );
}
