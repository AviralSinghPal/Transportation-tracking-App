package com.transporthq.app.ui.components

import androidx.compose.foundation.layout.RowScope
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.transporthq.app.ui.theme.Indigo600
import com.transporthq.app.ui.theme.White

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TopBar(
    title: String,
    onLogout: (() -> Unit)? = null,
    onNotifications: (() -> Unit)? = null,
    onChat: (() -> Unit)? = null,
    onSettings: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
    modifier: Modifier = Modifier
) {
    TopAppBar(
        title = {
            Text(
                text = title,
                fontWeight = FontWeight.Bold
            )
        },
        actions = {
            actions()
            if (onChat != null) {
                IconButton(onClick = onChat) {
                    Icon(imageVector = Icons.Default.Chat, contentDescription = "Chat", tint = White)
                }
            }
            if (onNotifications != null) {
                IconButton(onClick = onNotifications) {
                    Icon(imageVector = Icons.Default.Notifications, contentDescription = "Notifications", tint = White)
                }
            }
            if (onSettings != null) {
                IconButton(onClick = onSettings) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = "Settings",
                        tint = White
                    )
                }
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = Indigo600,
            titleContentColor = White,
            actionIconContentColor = White
        ),
        modifier = modifier
    )
}
