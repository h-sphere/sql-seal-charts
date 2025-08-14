import { App, setIcon } from "obsidian";
import { parseCode } from "./utils/configParser";
import { prepareDataVariables } from "./utils/prepareDataVariables";
import * as echarts from 'echarts';
import * as ecStat from 'echarts-stat';
import type { RendererConfig } from "@hypersphere/sqlseal";
import { ViewDefinition } from "@hypersphere/sqlseal/dist/src/grammar/parser";
import { parseCodeAdvanced } from "./utils/advancedParser";
import { FullScreenChartModal } from "./fullscreenModal";

interface Config {
    config: string
}

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

    private createFullscreenButton(container: HTMLElement, chartConfig: Record<string, any>) {
        const fullscreenButton = container.createEl('button', { 
            cls: 'sqlseal-fullscreen-button',
            attr: { 'aria-label': 'Open chart in fullscreen' }
        })
        setIcon(fullscreenButton, 'maximize-2')
        
        fullscreenButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const modal = new FullScreenChartModal(this.app, chartConfig);
            modal.open();
        })
    }

    render(config: Config, el: HTMLElement) {
        let isRendered: boolean = false
        let chart: echarts.ECharts | null = null
        let resizeObserver: ResizeObserver | null = null
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
                
                const chartHeader = container.createDiv({ cls: 'sqlseal-chart-header' })
                const chartDiv = container.createDiv({ cls: 'sqlseal-chart-content' })
                
                this.createFullscreenButton(chartHeader, configRecord)
                
                requestAnimationFrame(() => {
                    const containerBox = container.getBoundingClientRect()
                    const width = containerBox.width
                    const height = containerBox.height
                    chart = echarts.init(chartDiv, null, { height: height, width: width })
                    chart.setOption(configRecord)
                    isRendered = true
                    
                    // Set up ResizeObserver to handle container size changes
                    resizeObserver = new ResizeObserver((entries) => {
                        if (chart && entries.length > 0) {
                            const entry = entries[0]
                            const { width: newWidth } = entry.contentRect
                            // Maintain 16:9 aspect ratio
                            const newHeight = (newWidth * 9) / 16
                            chart.resize({ width: newWidth, height: newHeight })
                        }
                    })
                    resizeObserver.observe(container)
                })
            },
            error: (error: string) => {
                return createDiv({ text: error, cls: 'sqlseal-error' })
            },
            destroy: () => {
                if (resizeObserver) {
                    resizeObserver.disconnect()
                    resizeObserver = null
                }
                if (chart) {
                    chart.dispose()
                    chart = null
                }
            }
        }
    }
}