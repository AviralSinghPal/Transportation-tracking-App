package com.transporthq.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.transporthq.app.ui.theme.*

data class StatusColors(val background: Color, val text: Color)

fun getStatusColors(status: String): StatusColors {
    return when (status.lowercase()) {
        "pending" -> StatusColors(Amber100, Amber600)
        "approved" -> StatusColors(Blue100, Blue600)
        "assigned" -> StatusColors(Indigo100, Indigo600)
        "driver-departed", "driver_departed" -> StatusColors(Blue100, Blue600)
        "arrived-pickup", "arrived_pickup" -> StatusColors(Amber100, Amber600)
        "in-progress", "in_progress" -> StatusColors(Indigo100, Indigo600)
        "completed" -> StatusColors(Green100, Green700)
        "cancelled", "canceled" -> StatusColors(Red100, Red600)
        "rejected" -> StatusColors(Red100, Red600)
        "active", "available", "on-duty" -> StatusColors(Green100, Green700)
        "inactive", "off-duty" -> StatusColors(Gray200, Gray600)
        "on-trip", "busy" -> StatusColors(Blue100, Blue600)
        "maintenance" -> StatusColors(Amber100, Amber600)
        else -> StatusColors(Gray200, Gray600)
    }
}

fun getStatusDisplayName(status: String): String {
    return when (status.lowercase()) {
        "pending" -> "Pending"
        "approved" -> "Approved"
        "assigned" -> "Assigned"
        "driver-departed", "driver_departed" -> "Driver Departed"
        "arrived-pickup", "arrived_pickup" -> "At Pickup"
        "in-progress", "in_progress" -> "In Progress"
        "completed" -> "Completed"
        "cancelled", "canceled" -> "Cancelled"
        "rejected" -> "Rejected"
        "active" -> "Active"
        "available" -> "Available"
        "on-duty" -> "On Duty"
        "off-duty" -> "Off Duty"
        "on-trip" -> "On Trip"
        "busy" -> "Busy"
        "maintenance" -> "Maintenance"
        else -> status.replaceFirstChar { it.uppercase() }
    }
}

@Composable
fun StatusBadge(
    status: String,
    modifier: Modifier = Modifier
) {
    val colors = getStatusColors(status)
    val displayName = getStatusDisplayName(status)

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(colors.background)
            .padding(horizontal = 10.dp, vertical = 4.dp)
    ) {
        Text(
            text = displayName,
            color = colors.text,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            style = MaterialTheme.typography.labelMedium
        )
    }
}
