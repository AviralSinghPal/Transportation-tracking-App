package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class AppNotification(
    @SerializedName("_id") val id: String = "",
    val title: String = "",
    val message: String = "",
    val type: String = "",
    val read: Boolean = false,
    val userId: String = "",
    val createdAt: String? = null
)
