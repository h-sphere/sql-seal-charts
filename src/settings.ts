export interface GlobalChartConfig {
    name: string;
    config: string; // JSON string
}

export interface SQLSealChartsSettings {
    globalConfigs: GlobalChartConfig[];
}

export const DEFAULT_SETTINGS: SQLSealChartsSettings = {
    globalConfigs: [
        {
            name: "defaultTheme",
            config: `{
  backgroundColor: "#ffffff",
  textStyle: {
    color: "#333333",
    fontFamily: "Arial, sans-serif"
  }
}`
        },
        {
            name: "pieChart",
            config: `{
  type: 'pie',
  radius: '70%',
  emphasis: {
    itemStyle: {
      shadowBlur: 10,
      shadowOffsetX: 0,
      shadowColor: 'rgba(0, 0, 0, 0.5)'
    }
  }
}`
        }
    ]
};