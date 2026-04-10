package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class AppNotification(
    @SerializedName("_id") val id: String = "",
    val title: String = "",
    val message: String = "",
    val type: String = "",
    val read: Boolean = false,
    val userId: String = "",
    val data: NotificationData? = null,
    val createdAt: String? = null
)

data class NotificationData(
    val rideRequestId: String? = null,
    val tripId: String? = null,
    val driverId: String? = null
)

data class NotificationsResponse(
    val notifications: List<AppNotification> = emptyList()
)

data class UnreadCountResponse(
    val count: Int = 0
)
