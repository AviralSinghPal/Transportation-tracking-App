package com.transporthq.app.data.models

import com.google.gson.annotations.SerializedName

data class User(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val email: String = "",
    val role: String = "",
    val phone: String = "",
    val department: String = "",
    val status: String = "active",
    val avatar: String? = null
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val token: String,
    val user: User
)

data class AuthState(
    val isLoggedIn: Boolean = false,
    val token: String? = null,
    val user: User? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)
