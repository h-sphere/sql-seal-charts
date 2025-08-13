import { App, Modal } from "obsidian";
import * as echarts from 'echarts';

export class FullScreenChartModal extends Modal {
    private chart: echarts.ECharts | null = null;
    private chartConfig: Record<string, any>;
    private resizeHandler: (() => void) | null = null;

    constructor(app: App, chartConfig: Record<string, any>) {
        super(app);
        this.chartConfig = chartConfig;
        
        this.scope.register([], "Escape", () => {
            this.close();
        });
    }

    onOpen() {
        const { contentEl, modalEl } = this;
        contentEl.empty();
        
        // Apply fullscreen classes
        modalEl.addClass('sqlseal-fullscreen-modal');
        contentEl.addClass('sqlseal-fullscreen-modal');
        
        // Force modal to fullscreen dimensions
        modalEl.style.width = '100vw';
        modalEl.style.height = '100vh';
        modalEl.style.maxWidth = 'none';
        modalEl.style.maxHeight = 'none';
        modalEl.style.left = '0';
        modalEl.style.top = '0';
        modalEl.style.transform = 'none';
        modalEl.style.margin = '0';
        
        // Set content area dimensions
        contentEl.style.width = '95vw';
        contentEl.style.height = '90vh';
        contentEl.style.maxWidth = 'none';
        contentEl.style.maxHeight = 'none';
        contentEl.style.margin = '2.5vh 2.5vw';
        contentEl.style.position = 'absolute';
        contentEl.style.left = '2.5vw';
        contentEl.style.top = '5vh';
        
        const chartContainer = contentEl.createDiv({ cls: 'sqlseal-fullscreen-chart-container' });
        
        // Initialize chart after modal is rendered
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const containerRect = chartContainer.getBoundingClientRect();
                
                const width = containerRect.width || window.innerWidth * 0.9;
                const height = containerRect.height || window.innerHeight * 0.8;
                
                this.chart = echarts.init(chartContainer, null, { width, height });
                this.chart.setOption(this.chartConfig);
                
                this.resizeHandler = () => {
                    if (this.chart) {
                        this.chart.resize();
                    }
                };
                
                window.addEventListener('resize', this.resizeHandler);
                
                // Ensure proper sizing after initialization
                setTimeout(() => {
                    if (this.chart) {
                        this.chart.resize();
                    }
                }, 100);
            });
        });
    }

    onClose() {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }
    }
}