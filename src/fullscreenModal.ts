import { App, Modal } from "obsidian";
import * as echarts from "echarts";

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
    modalEl.addClass("sqlseal-fullscreen-modal");

    const chartContainer = contentEl.createDiv({
      cls: "sqlseal-fullscreen-chart-container",
    });

    // Initialize chart after modal is rendered
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

      window.addEventListener("resize", this.resizeHandler);

      // Show modal after chart is loaded
      modalEl.addClass("loaded");

      // Ensure proper sizing after initialization
      setTimeout(() => {
        if (this.chart) {
          this.chart.resize();
        }
      }, 100);
    });
  }

  onClose() {
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  }
}
