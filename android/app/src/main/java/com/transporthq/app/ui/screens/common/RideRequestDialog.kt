package com.transporthq.app.ui.screens.common

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.transporthq.app.data.models.CreateRideRequest
import com.transporthq.app.data.models.LocationInfo
import com.transporthq.app.ui.theme.*

@Composable
fun RideRequestDialog(
    onDismiss: () -> Unit,
    onSubmit: (CreateRideRequest) -> Unit
) {
    var pickupAddress by remember { mutableStateOf("") }
    var dropoffAddress by remember { mutableStateOf("") }
    var pickupTime by remember { mutableStateOf("") }
    var passengerCount by remember { mutableStateOf("1") }
    var priority by remember { mutableStateOf("normal") }
    var department by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var expandedPriority by remember { mutableStateOf(false) }

    val priorities = listOf("low", "normal", "high", "urgent")

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .heightIn(max = 600.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = White),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Request a Ride",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Gray900
                )

                Text(
                    text = "Fill in the details for your ride request",
                    fontSize = 14.sp,
                    color = Gray500
                )

                OutlinedTextField(
                    value = pickupAddress,
                    onValueChange = { pickupAddress = it },
                    label = { Text("Pickup Location") },
                    leadingIcon = { Icon(Icons.Default.TripOrigin, contentDescription = null, tint = Green600) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    singleLine = true
                )

                OutlinedTextField(
                    value = dropoffAddress,
                    onValueChange = { dropoffAddress = it },
                    label = { Text("Dropoff Location") },
                    leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null, tint = Red500) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    singleLine = true
                )

                OutlinedTextField(
                    value = pickupTime,
                    onValueChange = { pickupTime = it },
                    label = { Text("Pickup Time (YYYY-MM-DD HH:MM)") },
                    leadingIcon = { Icon(Icons.Default.Schedule, contentDescription = null, tint = Indigo600) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    singleLine = true,
                    placeholder = { Text("2026-03-16 14:00") }
                )

                OutlinedTextField(
                    value = passengerCount,
                    onValueChange = { if (it.all { c -> c.isDigit() } && it.length <= 2) passengerCount = it },
                    label = { Text("Passenger Count") },
                    leadingIcon = { Icon(Icons.Default.People, contentDescription = null, tint = Indigo600) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )

                // Priority dropdown
                ExposedDropdownMenuBox(
                    expanded = expandedPriority,
                    onExpandedChange = { expandedPriority = it }
                ) {
                    OutlinedTextField(
                        value = priority.replaceFirstChar { it.uppercase() },
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Priority") },
                        leadingIcon = { Icon(Icons.Default.Flag, contentDescription = null, tint = Amber600) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedPriority) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        shape = RoundedCornerShape(10.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = expandedPriority,
                        onDismissRequest = { expandedPriority = false }
                    ) {
                        priorities.forEach { p ->
                            DropdownMenuItem(
                                text = { Text(p.replaceFirstChar { it.uppercase() }) },
                                onClick = {
                                    priority = p
                                    expandedPriority = false
                                }
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = department,
                    onValueChange = { department = it },
                    label = { Text("Department") },
                    leadingIcon = { Icon(Icons.Default.Business, contentDescription = null, tint = Gray500) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    singleLine = true
                )

                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notes (optional)") },
                    leadingIcon = { Icon(Icons.Default.Notes, contentDescription = null, tint = Gray500) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    minLines = 2,
                    maxLines = 3
                )

                // Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = Gray500, fontSize = 15.sp)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Button(
                        onClick = {
                            val formattedTime = if (pickupTime.contains("T")) pickupTime
                            else pickupTime.replace(" ", "T") + ":00.000Z"

                            val request = CreateRideRequest(
                                pickupLocation = LocationInfo(address = pickupAddress),
                                dropoffLocation = LocationInfo(address = dropoffAddress),
                                pickupTime = formattedTime,
                                passengerCount = passengerCount.toIntOrNull() ?: 1,
                                priority = priority,
                                department = department,
                                notes = notes
                            )
                            onSubmit(request)
                        },
                        enabled = pickupAddress.isNotBlank() && dropoffAddress.isNotBlank() && pickupTime.isNotBlank(),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                    ) {
                        Text("Submit Request", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}
