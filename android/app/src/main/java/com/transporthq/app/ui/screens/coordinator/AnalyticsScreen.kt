package com.transporthq.app.ui.screens.coordinator

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.transporthq.app.data.api.RetrofitClient
import com.transporthq.app.data.models.*
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class AnalyticsState(
    val dashboard: AnalyticsDashboard? = null,
    val driverPerformance: List<DriverPerformance> = emptyList(),
    val isLoading: Boolean = false,
    // Report tab states
    val dailyReport: DailyReport? = null,
    val timecards: List<TimecardEntry> = emptyList(),
    val utilization: List<VehicleUtilization> = emptyList(),
    val onTimeReport: OnTimeReport? = null,
    val costAnalysis: CostAnalysisReport? = null,
    val overtime: List<OvertimeEntry> = emptyList(),
    val isDailyLoading: Boolean = false,
    val isTimecardsLoading: Boolean = false,
    val isUtilizationLoading: Boolean = false,
    val isOnTimeLoading: Boolean = false,
    val isCostsLoading: Boolean = false,
    val isOvertimeLoading: Boolean = false
)

class AnalyticsViewModel(application: Application) : AndroidViewModel(application) {
    private val api = RetrofitClient.apiService
    private val _state = MutableStateFlow(AnalyticsState())
    val state: StateFlow<AnalyticsState> = _state.asStateFlow()

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    private val today = dateFormat.format(Date())

    init { loadData() }

    fun loadData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            try {
                val dashResp = api.getAnalyticsDashboard()
                val perfResp = api.getDriverPerformance()
                _state.value = _state.value.copy(
                    dashboard = dashResp.body(),
                    driverPerformance = perfResp.body() ?: emptyList(),
                    isLoading = false
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(isLoading = false)
            }
        }
    }

    fun loadDailyReport() {
        if (_state.value.dailyReport != null) return
        viewModelScope.launch {
            _state.value = _state.value.copy(isDailyLoading = true)
            try {
                val resp = api.getDailyReport(today)
                _state.value = _state.value.copy(dailyReport = resp.body(), isDailyLoading = false)
            } catch (e: Exception) {
                _state.value = _state.value.copy(isDailyLoading = false)
            }
        }
    }

    fun loadTimecards() {
        if (_state.value.timecards.isNotEmpty()) return
        viewModelScope.launch {
            _state.value = _state.value.copy(isTimecardsLoading = true)
            try {
                val resp = api.getTimecards(today, today)
                _state.value = _state.value.copy(timecards = resp.body() ?: emptyList(), isTimecardsLoading = false)
            } catch (e: Exception) {
                _state.value = _state.value.copy(isTimecardsLoading = false)
            }
        }
    }

    fun loadUtilization() {
        if (_state.value.utilization.isNotEmpty()) return
        viewModelScope.launch {
            _state.value = _state.value.copy(isUtilizationLoading = true)
            try {
                val resp = api.getVehicleUtilization(today, today)
                _state.value = _state.value.copy(utilization = resp.body() ?: emptyList(), isUtilizationLoading = false)
            } catch (e: Exception) {
                _state.value = _state.value.copy(isUtilizationLoading = false)
            }
        }
    }

    fun loadOnTime() {
        if (_state.value.onTimeReport != null) return
        viewModelScope.launch {
            _state.value = _state.value.copy(isOnTimeLoading = true)
            try {
                val resp = api.getOnTimeReport(today, today)
                _state.value = _state.value.copy(onTimeReport = resp.body(), isOnTimeLoading = false)
            } catch (e: Exception) {
                _state.value = _state.value.copy(isOnTimeLoading = false)
            }
        }
    }

    fun loadCosts() {
        if (_state.value.costAnalysis != null) return
        viewModelScope.launch {
            _state.value = _state.value.copy(isCostsLoading = true)
            try {
                val resp = api.getCostAnalysis(today, today)
                _state.value = _state.value.copy(costAnalysis = resp.body(), isCostsLoading = false)
            } catch (e: Exception) {
                _state.value = _state.value.copy(isCostsLoading = false)
            }
        }
    }

    fun loadOvertime() {
        if (_state.value.overtime.isNotEmpty()) return
        viewModelScope.launch {
            _state.value = _state.value.copy(isOvertimeLoading = true)
            try {
                val resp = api.getOvertimeReport(today, today)
                _state.value = _state.value.copy(overtime = resp.body() ?: emptyList(), isOvertimeLoading = false)
            } catch (e: Exception) {
                _state.value = _state.value.copy(isOvertimeLoading = false)
            }
        }
    }
}

@Composable
fun AnalyticsScreen(viewModel: AnalyticsViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var selectedTab by remember { mutableIntStateOf(0) }

    Column(modifier = Modifier.fillMaxSize().background(Gray50)) {
        Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Insights & Reports", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Gray900)
            IconButton(onClick = { viewModel.loadData() }) { Icon(Icons.Default.Refresh, tint = Indigo600, contentDescription = "Refresh") }
        }

        ScrollableTabRow(
            selectedTabIndex = selectedTab,
            containerColor = White,
            contentColor = Indigo600,
            edgePadding = 16.dp
        ) {
            listOf("Dashboard", "Daily", "Timecards", "Utilization", "On-Time", "Costs", "Overtime").forEachIndexed { index, title ->
                Tab(selected = selectedTab == index, onClick = { selectedTab = index },
                    text = { Text(title, fontSize = 13.sp) })
            }
        }

        when (selectedTab) {
            0 -> DashboardTab(state)
            1 -> DailyReportTab(viewModel, state)
            2 -> TimecardsTab(viewModel, state)
            3 -> UtilizationTab(viewModel, state)
            4 -> OnTimeTab(viewModel, state)
            5 -> CostsTab(viewModel, state)
            6 -> OvertimeTab(viewModel, state)
        }
    }
}

@Composable
private fun DashboardTab(state: AnalyticsState) {
    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Spacer(modifier = Modifier.height(8.dp))
        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Indigo600) }
        } else {
            state.dashboard?.let { dash ->
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    KpiCard(Modifier.weight(1f), "${dash.totalTrips}", "Total Trips", Indigo600)
                    KpiCard(Modifier.weight(1f), "${String.format("%.0f", dash.completionRate)}%", "Completion", Green600)
                }
                Spacer(modifier = Modifier.height(10.dp))
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    KpiCard(Modifier.weight(1f), "$${String.format("%.2f", dash.totalCost)}", "Total Cost", Amber600)
                    KpiCard(Modifier.weight(1f), "${String.format("%.0f", dash.totalMiles)}", "Total Miles", Gray600)
                }
            }

            if (state.driverPerformance.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                Text("Driver Performance", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Gray900, modifier = Modifier.padding(horizontal = 16.dp))
                Spacer(modifier = Modifier.height(8.dp))
                state.driverPerformance.forEach { driver ->
                    Card(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = White)) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(driver.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Gray900)
                                Text("${driver.totalTrips} trips -- ${String.format("%.1f", driver.averageRating)} stars", fontSize = 12.sp, color = Gray500)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("${driver.completedTrips}/${driver.totalTrips}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Green600)
                                Text("${String.format("%.0f", driver.onTimeRate)}% on-time", fontSize = 11.sp, color = Gray400)
                            }
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
private fun DailyReportTab(viewModel: AnalyticsViewModel, state: AnalyticsState) {
    LaunchedEffect(Unit) { viewModel.loadDailyReport() }

    if (state.isDailyLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Indigo600) }
    } else {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                Text("Daily Report", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Gray900)
                Spacer(modifier = Modifier.height(4.dp))
                Text("Report for today", fontSize = 13.sp, color = Gray500)
                Spacer(modifier = Modifier.height(12.dp))
            }
            state.dailyReport?.let { report ->
                item {
                    ReportCard(listOf(
                        "Date" to report.date,
                        "Total Trips" to "${report.totalTrips}",
                        "Completed Trips" to "${report.completedTrips}",
                        "Total Ride Requests" to "${report.totalRideRequests}",
                        "Active Drivers" to "${report.activeDrivers}",
                        "Total Miles" to String.format("%.1f", report.totalMiles),
                        "Total Cost" to "$${String.format("%.2f", report.totalCost)}"
                    ))
                }
            } ?: item {
                Text("No data available", color = Gray400, fontSize = 14.sp)
            }
        }
    }
}

@Composable
private fun TimecardsTab(viewModel: AnalyticsViewModel, state: AnalyticsState) {
    LaunchedEffect(Unit) { viewModel.loadTimecards() }

    if (state.isTimecardsLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Indigo600) }
    } else {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                Text("Timecards", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Gray900)
                Spacer(modifier = Modifier.height(4.dp))
                Text("Report for today", fontSize = 13.sp, color = Gray500)
                Spacer(modifier = Modifier.height(12.dp))
            }
            if (state.timecards.isEmpty()) {
                item { Text("No timecard data available", color = Gray400, fontSize = 14.sp) }
            } else {
                items(state.timecards) { entry ->
                    ReportCard(listOf(
                        "Driver" to entry.driverName,
                        "Total Hours" to String.format("%.1f", entry.totalHours),
                        "Trips" to "${entry.trips}",
                        "Date" to entry.date
                    ))
                }
            }
        }
    }
}

@Composable
private fun UtilizationTab(viewModel: AnalyticsViewModel, state: AnalyticsState) {
    LaunchedEffect(Unit) { viewModel.loadUtilization() }

    if (state.isUtilizationLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Indigo600) }
    } else {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                Text("Vehicle Utilization", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Gray900)
                Spacer(modifier = Modifier.height(4.dp))
                Text("Report for today", fontSize = 13.sp, color = Gray500)
                Spacer(modifier = Modifier.height(12.dp))
            }
            if (state.utilization.isEmpty()) {
                item { Text("No utilization data available", color = Gray400, fontSize = 14.sp) }
            } else {
                items(state.utilization) { entry ->
                    ReportCard(listOf(
                        "Vehicle" to entry.vehicleName,
                        "Total Trips" to "${entry.totalTrips}",
                        "Total Miles" to String.format("%.1f", entry.totalMiles),
                        "Utilization Rate" to "${String.format("%.0f", entry.utilizationRate)}%"
                    ))
                }
            }
        }
    }
}

@Composable
private fun OnTimeTab(viewModel: AnalyticsViewModel, state: AnalyticsState) {
    LaunchedEffect(Unit) { viewModel.loadOnTime() }

    if (state.isOnTimeLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Indigo600) }
    } else {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                Text("On-Time Performance", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Gray900)
                Spacer(modifier = Modifier.height(4.dp))
                Text("Report for today", fontSize = 13.sp, color = Gray500)
                Spacer(modifier = Modifier.height(12.dp))
            }
            state.onTimeReport?.let { report ->
                item {
                    ReportCard(listOf(
                        "Total Trips" to "${report.totalTrips}",
                        "On-Time Trips" to "${report.onTimeTrips}",
                        "Late Trips" to "${report.lateTrips}",
                        "On-Time Rate" to "${String.format("%.1f", report.onTimeRate)}%"
                    ))
                }
            } ?: item {
                Text("No data available", color = Gray400, fontSize = 14.sp)
            }
        }
    }
}

@Composable
private fun CostsTab(viewModel: AnalyticsViewModel, state: AnalyticsState) {
    LaunchedEffect(Unit) { viewModel.loadCosts() }

    if (state.isCostsLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Indigo600) }
    } else {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                Text("Cost Analysis", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Gray900)
                Spacer(modifier = Modifier.height(4.dp))
                Text("Report for today", fontSize = 13.sp, color = Gray500)
                Spacer(modifier = Modifier.height(12.dp))
            }
            state.costAnalysis?.let { report ->
                item {
                    ReportCard(listOf(
                        "Total Cost" to "$${String.format("%.2f", report.totalCost)}",
                        "Avg Cost Per Trip" to "$${String.format("%.2f", report.averageCostPerTrip)}"
                    ))
                }
                if (report.costByVehicle.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Cost by Vehicle", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Gray800)
                        Spacer(modifier = Modifier.height(4.dp))
                    }
                    items(report.costByVehicle) { entry ->
                        ReportCard(listOf(
                            "Vehicle" to entry.vehicleName,
                            "Cost" to "$${String.format("%.2f", entry.cost)}"
                        ))
                    }
                }
            } ?: item {
                Text("No data available", color = Gray400, fontSize = 14.sp)
            }
        }
    }
}

@Composable
private fun OvertimeTab(viewModel: AnalyticsViewModel, state: AnalyticsState) {
    LaunchedEffect(Unit) { viewModel.loadOvertime() }

    if (state.isOvertimeLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Indigo600) }
    } else {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                Text("Overtime Report", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Gray900)
                Spacer(modifier = Modifier.height(4.dp))
                Text("Report for today", fontSize = 13.sp, color = Gray500)
                Spacer(modifier = Modifier.height(12.dp))
            }
            if (state.overtime.isEmpty()) {
                item { Text("No overtime data available", color = Gray400, fontSize = 14.sp) }
            } else {
                items(state.overtime) { entry ->
                    ReportCard(listOf(
                        "Driver" to entry.driverName,
                        "Regular Hours" to String.format("%.1f", entry.regularHours),
                        "Overtime Hours" to String.format("%.1f", entry.overtimeHours),
                        "Date" to entry.date
                    ))
                }
            }
        }
    }
}

@Composable
private fun ReportCard(items: List<Pair<String, String>>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            items.forEachIndexed { index, (label, value) ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(label, fontSize = 13.sp, color = Gray500)
                    Text(value, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Gray900)
                }
                if (index < items.size - 1) {
                    Spacer(modifier = Modifier.height(6.dp))
                }
            }
        }
    }
}

@Composable
private fun KpiCard(modifier: Modifier, value: String, label: String, color: androidx.compose.ui.graphics.Color) {
    Card(modifier = modifier, shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = White)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(value, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = color)
            Spacer(modifier = Modifier.height(2.dp))
            Text(label, fontSize = 12.sp, color = Gray500)
        }
    }
}
