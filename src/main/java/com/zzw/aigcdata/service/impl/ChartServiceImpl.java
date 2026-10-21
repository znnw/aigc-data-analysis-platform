package com.zzw.aigcdata.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.zzw.aigcdata.model.entity.Chart;
import com.zzw.aigcdata.service.ChartService;
import com.zzw.aigcdata.mapper.ChartMapper;
import org.springframework.stereotype.Service;

/**
 *
 */
@Service
public class ChartServiceImpl extends ServiceImpl<ChartMapper, Chart>
    implements ChartService{

}
