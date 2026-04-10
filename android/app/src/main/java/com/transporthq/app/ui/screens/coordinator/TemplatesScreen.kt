package com.transporthq.app.ui.screens.coordinator

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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

data class TemplatesState(
    val dayTemplates: List<DayTemplate> = emptyList(),
    val tripTemplates: List<TripTemplate> = emptyList(),
    val isLoading: Boolean = false,
    val actionMessage: String? = null
)

class TemplatesViewModel(application: Application) : AndroidViewModel(application) {
    private val api = RetrofitClient.apiService
    private val _state = MutableStateFlow(TemplatesState())
    val state: StateFlow<TemplatesState> = _state.asStateFlow()

    init { loadData() }

    fun loadData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            try {
                val day = api.getDayTemplates().body() ?: emptyList()
                val trip = api.getTripTemplates().body() ?: emptyList()
                _state.value = _state.value.copy(dayTemplates = day, tripTemplates = trip, isLoading = false)
            } catch (e: Exception) { _state.value = _state.value.copy(isLoading = false) }
        }
    }

    fun captureDay(name: String) {
        viewModelScope.launch {
            try {
                api.captureDayTemplate(mapOf("name" to name))
                _state.value = _state.value.copy(actionMessage = "Day captured")
                loadData()
            } catch (e: Exception) { _state.value = _state.value.copy(actionMessage = "Failed: ${e.message}") }
        }
    }

    fun applyDayTemplate(id: String) {
        viewModelScope.launch {
            try {
                api.applyDayTemplate(id)
                _state.value = _state.value.copy(actionMessage = "Template applied")
            } catch (e: Exception) { _state.value = _state.value.copy(actionMessage = "Failed: ${e.message}") }
        }
    }

    fun createTripFromTemplate(id: String) {
        viewModelScope.launch {
            try {
                api.createTripFromTemplate(id)
                _state.value = _state.value.copy(actionMessage = "Trip created from template")
            } catch (e: Exception) { _state.value = _state.value.copy(actionMessage = "Failed: ${e.message}") }
        }
    }

    fun deleteDayTemplate(id: String) {
        viewModelScope.launch {
            try { api.deleteDayTemplate(id); _state.value = _state.value.copy(actionMessage = "Deleted"); loadData() }
            catch (e: Exception) { _state.value = _state.value.copy(actionMessage = "Failed: ${e.message}") }
        }
    }

    fun deleteTripTemplate(id: String) {
        viewModelScope.launch {
            try { api.deleteTripTemplate(id); _state.value = _state.value.copy(actionMessage = "Deleted"); loadData() }
            catch (e: Exception) { _state.value = _state.value.copy(actionMessage = "Failed: ${e.message}") }
        }
    }

    fun clearMessage() { _state.value = _state.value.copy(actionMessage = null) }
}

@Composable
fun TemplatesScreen(viewModel: TemplatesViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var selectedTab by remember { mutableIntStateOf(0) }
    var showCaptureDialog by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(state.actionMessage) { state.actionMessage?.let { snackbarHostState.showSnackbar(it); viewModel.clearMessage() } }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().background(Gray50)) {
            Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Templates", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Gray900)
                Button(onClick = { showCaptureDialog = true }, colors = ButtonDefaults.buttonColors(containerColor = Indigo600), shape = RoundedCornerShape(8.dp)) {
                    Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Capture Day", fontSize = 13.sp)
                }
            }

            TabRow(selectedTabIndex = selectedTab, containerColor = White) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("Day Schedules (${state.dayTemplates.size})") })
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("Trip Templates (${state.tripTemplates.size})") })
            }

            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Indigo600) }
            } else {
                when (selectedTab) {
                    0 -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(state.dayTemplates) { tmpl ->
                            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = White)) {
                                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(tmpl.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Gray900)
                                        Text("${tmpl.entries.size} entries • Used ${tmpl.usageCount} times", fontSize = 12.sp, color = Gray500)
                                    }
                                    OutlinedButton(onClick = { viewModel.applyDayTemplate(tmpl.id) }, shape = RoundedCornerShape(6.dp), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)) {
                                        Text("Apply", fontSize = 11.sp, color = Indigo600)
                                    }
                                    Spacer(modifier = Modifier.width(4.dp))
                                    IconButton(onClick = { viewModel.deleteDayTemplate(tmpl.id) }, modifier = Modifier.size(30.dp)) {
                                        Icon(Icons.Default.Delete, tint = Red500, modifier = Modifier.size(16.dp), contentDescription = "Delete")
                                    }
                                }
                            }
                        }
                        if (state.dayTemplates.isEmpty()) {
                            item { Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.CalendarMonth, tint = Gray400, modifier = Modifier.size(48.dp), contentDescription = null)
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text("No day schedules saved", color = Gray500, fontSize = 14.sp)
                                }
                            } }
                        }
                    }
                    1 -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(state.tripTemplates) { tmpl ->
                            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = White)) {
                                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(tmpl.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Gray900)
                                        Text("${tmpl.pickupLocation} → ${tmpl.dropoffLocation}", fontSize = 12.sp, color = Gray500)
                                    }
                                    OutlinedButton(onClick = { viewModel.createTripFromTemplate(tmpl.id) }, shape = RoundedCornerShape(6.dp), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)) {
                                        Text("Use", fontSize = 11.sp, color = Green600)
                                    }
                                    Spacer(modifier = Modifier.width(4.dp))
                                    IconButton(onClick = { viewModel.deleteTripTemplate(tmpl.id) }, modifier = Modifier.size(30.dp)) {
                                        Icon(Icons.Default.Delete, tint = Red500, modifier = Modifier.size(16.dp), contentDescription = "Delete")
                                    }
                                }
                            }
                        }
                        if (state.tripTemplates.isEmpty()) {
                            item { Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No trip templates", color = Gray500) } }
                        }
                    }
                }
            }
        }
        SnackbarHost(hostState = snackbarHostState, modifier = Modifier.align(Alignment.BottomCenter))
    }

    if (showCaptureDialog) {
        var name by remember { mutableStateOf("") }
        AlertDialog(onDismissRequest = { showCaptureDialog = false },
            title = { Text("Capture Day Schedule", fontWeight = FontWeight.Bold) },
            text = {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Template Name") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp))
            },
            confirmButton = { Button(onClick = { viewModel.captureDay(name); showCaptureDialog = false }, enabled = name.isNotBlank(), colors = ButtonDefaults.buttonColors(containerColor = Indigo600)) { Text("Capture") } },
            dismissButton = { TextButton(onClick = { showCaptureDialog = false }) { Text("Cancel") } },
            shape = RoundedCornerShape(16.dp))
    }
}
