package com.transporthq.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class TransportHQApp : Application() {
    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val locationChannel = NotificationChannel(
                LOCATION_CHANNEL_ID,
                "Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when GPS location is being shared"
            }

            val notificationChannel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Trip and ride request notifications"
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(locationChannel)
            manager.createNotificationChannel(notificationChannel)
        }
    }

    companion object {
        const val LOCATION_CHANNEL_ID = "location_tracking"
        const val NOTIFICATION_CHANNEL_ID = "notifications"
    }
}
