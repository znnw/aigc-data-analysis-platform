package com.zzw.aigcdata.manager;

import com.google.gson.Gson;
import com.zzw.aigcdata.api.DeepSeekApi;
import com.zzw.aigcdata.common.ErrorCode;
import com.zzw.aigcdata.exception.BusinessException;
import com.yupi.yucongming.dev.client.YuCongMingClient;
import com.yupi.yucongming.dev.common.BaseResponse;
import com.yupi.yucongming.dev.model.DevChatRequest;
import com.yupi.yucongming.dev.model.DevChatResponse;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 用于对接 AI 平台
 */
@Service
public class AiManager {

    @Resource
    private DeepSeekApi deepSeekApi;

    @Resource
    private YuCongMingClient yuCongMingClient;

    @Value("${yuapi.client.local-fallback:false}")
    private boolean localFallback;

    /**
     * AI 对话
     *
     * @param modelId
     * @param message
     * @return
     */
    public String doChat(long modelId, String message) {
        if (deepSeekApi.isConfigured()) {
            return deepSeekApi.chat(message);
        }
        if (localFallback) {
            return doLocalChat(message);
        }
        DevChatRequest devChatRequest = new DevChatRequest();
        devChatRequest.setModelId(modelId);
        devChatRequest.setMessage(message);
        BaseResponse<DevChatResponse> response = yuCongMingClient.doChat(devChatRequest);
        if (response == null) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "AI 响应错误");
        }
        return response.getData().getContent();
    }

    /**
     * 本地开发环境不依赖外部 AI 服务，根据 Excel 转换后的 CSV 生成基础图表。
     */
    private String doLocalChat(String message) {
        int dataIndex = message.indexOf("原始数据：");
        String csv = dataIndex >= 0 ? message.substring(dataIndex + "原始数据：".length()).trim() : "";
        if (StringUtils.isBlank(csv)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "本地分析缺少原始数据");
        }

        List<String[]> rows = new ArrayList<>();
        for (String line : csv.split("\\r?\\n")) {
            if (StringUtils.isNotBlank(line)) {
                rows.add(line.split(",", -1));
            }
            if (rows.size() >= 51) {
                break;
            }
        }
        if (rows.size() < 2) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "至少需要一行表头和一行数据");
        }

        List<String> labels = new ArrayList<>();
        List<Double> values = new ArrayList<>();
        int valueColumn = findValueColumn(rows);
        for (int i = 1; i < rows.size(); i++) {
            String[] row = rows.get(i);
            if (valueColumn >= row.length) {
                continue;
            }
            Double value = parseNumber(row[valueColumn]);
            if (value == null) {
                continue;
            }
            labels.add(cleanCell(row[0]));
            values.add(value);
        }
        if (values.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "没有找到可分析的数值列");
        }

        Map<String, Object> option = buildChartOption(message, labels, values);
        String genChart = new Gson().toJson(option);
        double sum = values.stream().mapToDouble(Double::doubleValue).sum();
        double min = values.stream().mapToDouble(Double::doubleValue).min().orElse(0);
        double max = values.stream().mapToDouble(Double::doubleValue).max().orElse(0);
        double average = sum / values.size();
        String conclusion = String.format(
                Locale.ROOT,
                "本地分析完成：共分析 %d 条数据，合计 %.2f，平均值 %.2f，最小值 %.2f，最大值 %.2f。趋势由图表中的折线或柱形展示。",
                values.size(), sum, average, min, max);
        return "【【【【【\n" + genChart + "\n【【【【【\n" + conclusion;
    }

    private int findValueColumn(List<String[]> rows) {
        for (int column = 1; column < rows.get(1).length; column++) {
            for (int row = 1; row < rows.size(); row++) {
                if (rows.get(row).length > column && parseNumber(rows.get(row)[column]) != null) {
                    return column;
                }
            }
        }
        throw new BusinessException(ErrorCode.PARAMS_ERROR, "没有找到可分析的数值列");
    }

    private Double parseNumber(String value) {
        try {
            return Double.parseDouble(cleanCell(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String cleanCell(String value) {
        return value == null ? "" : value.trim().replaceAll("^\"|\"$", "");
    }

    private Map<String, Object> buildChartOption(String message, List<String> labels, List<Double> values) {
        Map<String, Object> option = new LinkedHashMap<>();
        Map<String, Object> tooltip = new LinkedHashMap<>();
        tooltip.put("trigger", message.contains("饼图") ? "item" : "axis");
        option.put("tooltip", tooltip);
        if (message.contains("饼图")) {
            List<Map<String, Object>> pieData = new ArrayList<>();
            for (int i = 0; i < labels.size(); i++) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("name", labels.get(i));
                item.put("value", values.get(i));
                pieData.add(item);
            }
            Map<String, Object> series = new LinkedHashMap<>();
            series.put("type", "pie");
            series.put("radius", "60%");
            series.put("data", pieData);
            List<Object> seriesList = new ArrayList<>();
            seriesList.add(series);
            option.put("series", seriesList);
            return option;
        }

        Map<String, Object> xAxis = new LinkedHashMap<>();
        xAxis.put("type", "category");
        xAxis.put("data", labels);
        Map<String, Object> yAxis = new LinkedHashMap<>();
        yAxis.put("type", "value");
        Map<String, Object> series = new LinkedHashMap<>();
        series.put("type", message.contains("柱状图") ? "bar" : "line");
        series.put("smooth", true);
        series.put("data", values);
        List<Object> seriesList = new ArrayList<>();
        seriesList.add(series);
        option.put("xAxis", xAxis);
        option.put("yAxis", yAxis);
        option.put("series", seriesList);
        return option;
    }
}
