import { App } from "obsidian";
import { parseCode } from "./utils/configParser";
import { prepareDataVariables } from "./utils/prepareDataVariables";
import * as echarts from 'echarts';
import * as ecStat from 'echarts-stat';
import type { RendererConfig } from "@hypersphere/sqlseal";
import { ViewDefinition } from "@hypersphere/sqlseal/dist/src/grammar/parser";
import { parseCodeAdvanced } from "./utils/advancedParser";

interface Config {
    config: string
}

console.log((ecStat as any).transform)

echarts.registerTransform((ecStat as any).transform.clustering);
echarts.registerTransform((ecStat as any).transform.regression);
echarts.registerTransform((ecStat as any).transform.histogram);

export class ChartRenderer implements RendererConfig {

    constructor(private readonly app: App) {
    }

    get viewDefinition(): ViewDefinition {
        return {
            argument: 'javascriptTemplate',
            name: 'chart',
            singleLine: false
        }
    }

    get rendererKey() {
        return 'chart'
    }

    validateConfig(config: string): Config {
        return { config: config.trim() }
    }

    render(config: Config, el: HTMLElement) {
        let isRendered: boolean = false
        let chart: echarts.ECharts | null = null
        return {
            render: ({ columns, data, flags }: { columns: string[], data: Record<string, unknown>[], flags: Record<string, boolean> }) => {

                const isAdvancedMode = !!(flags?.isAdvancedMode)

                if (config.config[0] !== '{' && !isAdvancedMode) {
                    throw new Error('To process JavaScript, set ADVANCED MODE flag')
                }
                const { functions, variables } = prepareDataVariables({ columns, data })

                let parsedConfig: Object = {}
                if (isAdvancedMode) {
                    try {
                        parsedConfig = parseCodeAdvanced({ functions, variables }, config.config)
                    } catch (e) {
                        console.error(e)
                        throw e
                    }
                } else {
                    parsedConfig = parseCode(config.config, functions, variables) as Object
                }
                if (!parsedConfig || typeof parsedConfig !== 'object') {
                    throw new Error('Issue with parsing config')
                }
                const configRecord = parsedConfig as Record<string, any>
                const { dataset = [] } = configRecord
                if (dataset[0]?.id !== 'data') {
                    configRecord.dataset = [{ id: 'data', source: data }, ...dataset] 
                }
                
                if (isRendered) {
                    // Data update
                    chart?.setOption(configRecord)
                    return
                }

                el.empty()
                const container = el.createDiv({ cls: 'sqlseal-charts-container' })
                const chartDiv = container.createDiv()
                requestAnimationFrame(() => {
                    const box = container.getBoundingClientRect()
                    const width = box.width
                    const height = box.height
                    chart = echarts.init(chartDiv, null, { height: height, width: width,  })
                    chart.setOption(configRecord)
                    isRendered = true
                })
            },
            error: (error: string) => {
                return createDiv({ text: error, cls: 'sqlseal-error' })
            }
        }
    }
}