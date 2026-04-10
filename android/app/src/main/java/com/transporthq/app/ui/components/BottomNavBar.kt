package com.transporthq.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.transporthq.app.ui.theme.Indigo600
import com.transporthq.app.ui.theme.Gray400

data class BottomNavItem(
    val label: String,
    val icon: ImageVector,
    val route: String
)

fun getNavItemsForRole(role: String): List<BottomNavItem> {
    return when (role) {
        "coordinator" -> listOf(
            BottomNavItem("Dashboard", Icons.Default.Dashboard, "coordinator/dashboard"),
            BottomNavItem("Trips", Icons.Default.DirectionsCar, "coordinator/trips"),
            BottomNavItem("Rides", Icons.Default.ListAlt, "coordinator/rides"),
            BottomNavItem("Fleet", Icons.Default.LocalShipping, "coordinator/fleet"),
            BottomNavItem("Map", Icons.Default.Map, "coordinator/map")
        )
        "driver" -> listOf(
            BottomNavItem("My Trips", Icons.Default.DirectionsCar, "driver/trips"),
            BottomNavItem("My Rides", Icons.Default.ListAlt, "driver/rides"),
            BottomNavItem("Map", Icons.Default.Map, "driver/map")
        )
        "passenger" -> listOf(
            BottomNavItem("My Trips", Icons.Default.DirectionsCar, "passenger/trips"),
            BottomNavItem("My Rides", Icons.Default.ListAlt, "passenger/rides")
        )
        else -> emptyList()
    }
}

@Composable
fun BottomNavBar(
    navController: NavController,
    role: String
) {
    val items = getNavItemsForRole(role)
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface
    ) {
        items.forEach { item ->
            val isSelected = currentRoute == item.route
            NavigationBarItem(
                icon = {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = item.label
                    )
                },
                label = { Text(item.label) },
                selected = isSelected,
                onClick = {
                    if (currentRoute != item.route) {
                        navController.navigate(item.route) {
                            popUpTo(navController.graph.startDestinationId) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Indigo600,
                    selectedTextColor = Indigo600,
                    unselectedIconColor = Gray400,
                    unselectedTextColor = Gray400,
                    indicatorColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    }
}
