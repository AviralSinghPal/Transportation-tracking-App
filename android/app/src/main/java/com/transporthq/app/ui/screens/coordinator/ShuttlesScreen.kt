package com.transporthq.app.ui.screens.coordinator

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.transporthq.app.data.api.RetrofitClient
import com.transporthq.app.ui.components.StatusBadge
import com.transporthq.app.data.models.*
import com.transporthq.app.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ShuttlesState(
    val routes: List<ShuttleRoute> = emptyList(),
    val schedule: List<ShuttleRun> = emptyList(),
    val isLoading: Boolean = false,
    val actionMessage: String? = null
)

class ShuttlesViewModel(application: Application) : AndroidViewModel(application) {
    private val api = RetrofitClient.apiService
    private val _state = MutableStateFlow(ShuttlesState())
    val state: StateFlow<ShuttlesState> = _state.asStateFlow()

    init { loadData() }

    fun loadData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            try {
                val routes = api.getShuttleRoutes().body() ?: emptyList()
                val schedule = api.getShuttleSchedule().body() ?: emptyList()
                _state.value = _state.value.copy(routes = routes, schedule = schedule, isLoading = false)
            } catch (e: Exception) { _state.value = _state.value.copy(isLoading = false) }
        }
    }

    fun deleteRoute(id: String) {
        viewModelScope.launch {
            try {
                api.deleteShuttleRoute(id)
                _state.value = _state.value.copy(actionMessage = "Route deleted")
                loadData()
            } catch (e: Exception) { _state.value = _state.value.copy(actionMessage = "Failed: ${e.message}") }
        }
    }

    fun generateRuns(routeId: String) {
        viewModelScope.launch {
            try {
                api.generateShuttleRuns(routeId)
                _state.value = _state.value.copy(actionMessage = "Runs generated")
                loadData()
            } catch (e: Exception) { _state.value = _state.value.copy(actionMessage = "Failed: ${e.message}") }
        }
    }

    fun clearMessage() { _state.value = _state.value.copy(actionMessage = null) }
}

@Composable
fun ShuttlesScreen(viewModel: ShuttlesViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var selectedTab by remember { mutableIntStateOf(0) }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(state.actionMessage) { state.actionMessage?.let { snackbarHostState.showSnackbar(it); viewModel.clearMessage() } }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().background(Gray50)) {
            Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Routes", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Gray900)
                IconButton(onClick = { viewModel.loadData() }) { Icon(Icons.Default.Refresh, tint = Indigo600, contentDescription = "Refresh") }
            }

            // Stats
            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatCard(Modifier.weight(1f), "${state.routes.size}", "Total Routes", Indigo600)
                StatCard(Modifier.weight(1f), "${state.routes.count { it.isActive }}", "Active", Green600)
                StatCard(Modifier.weight(1f), "${state.schedule.size}", "Scheduled", Amber600)
            }

            Spacer(modifier = Modifier.height(8.dp))
            TabRow(selectedTabIndex = selectedTab, containerColor = White) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("Routes") })
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("Today's Schedule (${state.schedule.size})") })
            }

            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Indigo600) }
            } else {
                when (selectedTab) {
                    0 -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(state.routes) { route ->
                            ShuttleRouteCard(route = route, onDelete = { viewModel.deleteRoute(route.id) }, onGenerate = { viewModel.generateRuns(route.id) })
                        }
                        if (state.routes.isEmpty()) {
                            item { Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No shuttle routes", color = Gray500) } }
                        }
                    }
                    1 -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(state.schedule) { run ->
                            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = White)) {
                                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(run.route?.name ?: "Unknown Route", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Gray900)
                                        Text("${run.occupancy}/${run.capacity} passengers • ${run.status}", fontSize = 12.sp, color = Gray500)
                                    }
                                    StatusBadge(status = run.status)
                                }
                            }
                        }
                        if (state.schedule.isEmpty()) {
                            item { Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No runs scheduled today", color = Gray500) } }
                        }
                    }
                }
            }
        }
        SnackbarHost(hostState = snackbarHostState, modifier = Modifier.align(Alignment.BottomCenter))
    }
}

@Composable
private fun ShuttleRouteCard(route: ShuttleRoute, onDelete: () -> Unit, onGenerate: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = White), elevation = CardDefaults.cardElevation(2.dp)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(route.name, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Gray900)
                    Spacer(modifier = Modifier.width(8.dp))
                    StatusBadge(status = route.type)
                }
                StatusBadge(status = if (route.isActive) "active" else "inactive")
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text("Every ${route.frequency} min • ${route.startTime} – ${route.endTime} • ${route.capacity} seats", fontSize = 12.sp, color = Gray500)

            if (route.stops.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                route.stops.forEachIndexed { index, stop ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.size(20.dp).clip(CircleShape).background(if (index == 0) Green600 else if (index == route.stops.size - 1) Red500 else Indigo600), contentAlignment = Alignment.Center) {
                            Text("${index + 1}", fontSize = 10.sp, color = White, fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("${stop.name} ${if (stop.estimatedTime.isNotBlank()) "(${stop.estimatedTime})" else ""}", fontSize = 12.sp, color = Gray600)
                    }
                    if (index < route.stops.size - 1) Spacer(modifier = Modifier.height(2.dp))
                }
            }

            Spacer(modifier = Modifier.height(6.dp))
            Text(route.daysActive.joinToString(", "), fontSize = 11.sp, color = Gray400)
            if (route.assignedDriver != null) Text("Driver: ${route.assignedDriver.name}", fontSize = 11.sp, color = Gray500)
            if (route.assignedVehicle != null) Text("Vehicle: ${route.assignedVehicle.name}", fontSize = 11.sp, color = Gray500)

            Spacer(modifier = Modifier.height(8.dp))
            Divider(color = Gray200)
            Spacer(modifier = Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onGenerate, shape = RoundedCornerShape(6.dp), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp), modifier = Modifier.height(30.dp)) {
                    Text("Generate Runs", fontSize = 11.sp, color = Indigo600)
                }
                IconButton(onClick = onDelete, modifier = Modifier.size(30.dp)) {
                    Icon(Icons.Default.Delete, tint = Red500, modifier = Modifier.size(16.dp), contentDescription = "Delete")
                }
            }
        }
    }
}

@Composable
private fun StatCard(modifier: Modifier, value: String, label: String, color: androidx.compose.ui.graphics.Color) {
    Card(modifier = modifier, shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = White)) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = color)
            Text(label, fontSize = 11.sp, color = Gray500)
        }
    }
}
