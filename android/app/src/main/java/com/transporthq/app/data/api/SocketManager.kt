package com.transporthq.app.data.api

import android.util.Log
import com.google.gson.Gson
import com.transporthq.app.data.models.DriverLocation
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import org.json.JSONObject

object SocketManager {
    private const val TAG = "SocketManager"
    private const val SERVER_URL = "http://10.0.2.2:5001"

    private var socket: Socket? = null
    private val gson = Gson()

    private val _driverLocationUpdates = MutableSharedFlow<DriverLocation>(extraBufferCapacity = 64)
    val driverLocationUpdates: SharedFlow<DriverLocation> = _driverLocationUpdates.asSharedFlow()

    private val _rideRequestNew = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val rideRequestNew: SharedFlow<String> = _rideRequestNew.asSharedFlow()

    private val _rideRequestUpdated = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val rideRequestUpdated: SharedFlow<String> = _rideRequestUpdated.asSharedFlow()

    private val _notificationNew = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val notificationNew: SharedFlow<String> = _notificationNew.asSharedFlow()

    private val _tripCreated = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val tripCreated: SharedFlow<String> = _tripCreated.asSharedFlow()

    private val _tripUpdated = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val tripUpdated: SharedFlow<String> = _tripUpdated.asSharedFlow()

    private val _tripAssigned = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val tripAssigned: SharedFlow<String> = _tripAssigned.asSharedFlow()

    private val _chatMessage = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val chatMessage: SharedFlow<String> = _chatMessage.asSharedFlow()

    private val _driverOffline = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val driverOffline: SharedFlow<String> = _driverOffline.asSharedFlow()

    private val _connectionState = MutableSharedFlow<Boolean>(replay = 1, extraBufferCapacity = 4)
    val connectionState: SharedFlow<Boolean> = _connectionState.asSharedFlow()

    fun connect(token: String) {
        try {
            disconnect()

            val options = IO.Options().apply {
                auth = mapOf("token" to token)
                forceNew = true
                reconnection = true
                reconnectionAttempts = 10
                reconnectionDelay = 1000
                timeout = 10000
            }

            socket = IO.socket(SERVER_URL, options).apply {
                on(Socket.EVENT_CONNECT) {
                    Log.d(TAG, "Socket connected")
                    _connectionState.tryEmit(true)
                }

                on(Socket.EVENT_DISCONNECT) {
                    Log.d(TAG, "Socket disconnected")
                    _connectionState.tryEmit(false)
                }

                on(Socket.EVENT_CONNECT_ERROR) { args ->
                    Log.e(TAG, "Socket connection error: ${args.firstOrNull()}")
                    _connectionState.tryEmit(false)
                }

                on("driver:location-update") { args ->
                    try {
                        val data = args[0] as JSONObject
                        val driverLocation = DriverLocation(
                            driverId = data.optString("driverId", ""),
                            lat = data.optDouble("lat", 0.0),
                            lng = data.optDouble("lng", 0.0),
                            speed = data.optDouble("speed", 0.0),
                            heading = data.optDouble("heading", 0.0)
                        )
                        _driverLocationUpdates.tryEmit(driverLocation)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing driver location", e)
                    }
                }

                on("rideRequest:new") { args ->
                    try {
                        val data = args[0].toString()
                        _rideRequestNew.tryEmit(data)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing new ride request", e)
                    }
                }

                on("rideRequest:updated") { args ->
                    try {
                        val data = args[0].toString()
                        _rideRequestUpdated.tryEmit(data)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing updated ride request", e)
                    }
                }

                on("notification:new") { args ->
                    try {
                        val data = args[0].toString()
                        _notificationNew.tryEmit(data)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing notification", e)
                    }
                }

                on("trip:created") { args ->
                    try { _tripCreated.tryEmit(args[0].toString()) }
                    catch (e: Exception) { Log.e(TAG, "Error parsing trip:created", e) }
                }

                on("trip:updated") { args ->
                    try { _tripUpdated.tryEmit(args[0].toString()) }
                    catch (e: Exception) { Log.e(TAG, "Error parsing trip:updated", e) }
                }

                on("trip:assigned") { args ->
                    try { _tripAssigned.tryEmit(args[0].toString()) }
                    catch (e: Exception) { Log.e(TAG, "Error parsing trip:assigned", e) }
                }

                on("chat:message") { args ->
                    try { _chatMessage.tryEmit(args[0].toString()) }
                    catch (e: Exception) { Log.e(TAG, "Error parsing chat:message", e) }
                }

                on("driver:offline") { args ->
                    try { _driverOffline.tryEmit(args[0].toString()) }
                    catch (e: Exception) { Log.e(TAG, "Error parsing driver:offline", e) }
                }

                connect()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error connecting socket", e)
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
    }

    fun emitDriverLocation(lat: Double, lng: Double, speed: Double, heading: Double) {
        try {
            val data = JSONObject().apply {
                put("lat", lat)
                put("lng", lng)
                put("speed", speed)
                put("heading", heading)
            }
            socket?.emit("driver:location", data)
        } catch (e: Exception) {
            Log.e(TAG, "Error emitting driver location", e)
        }
    }

    fun trackDriver(driverId: String) {
        try {
            val data = JSONObject().apply {
                put("driverId", driverId)
            }
            socket?.emit("track:driver", data)
        } catch (e: Exception) {
            Log.e(TAG, "Error tracking driver", e)
        }
    }

    fun isConnected(): Boolean = socket?.connected() == true
}
