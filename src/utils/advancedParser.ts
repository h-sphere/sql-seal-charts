import { uniqBy } from "lodash"

type Params = {
    functions: Record<string, any>,
    variables: Record<string, any>
    configs: Record<string, any>
}

export const parseCodeAdvanced = ({ functions, variables, configs }: Params, code: string) => {
    const { keys, values } = uniqBy([
        ...Object.entries(functions),
        ...Object.entries({
            data: variables.data,
            columns: variables.columns,
            ...configs
        })
    ], 0).reduce(({ keys, values}, [key, value]) => ({
        keys: [...keys, key],
        values: [...values, value]
    }), { keys: [], values: []})
    const fn = new Function(...keys, code)

    return fn(...values)
}