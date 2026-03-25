package com.transporthq.app.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.transporthq.app.data.api.RetrofitClient
import com.transporthq.app.data.api.SocketManager
import com.transporthq.app.data.models.LoginRequest
import com.transporthq.app.data.models.LoginResponse
import com.transporthq.app.data.models.User
import com.google.gson.Gson
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

class AuthRepository(private val context: Context) {

    private val gson = Gson()

    companion object {
        private val TOKEN_KEY = stringPreferencesKey("auth_token")
        private val USER_KEY = stringPreferencesKey("auth_user")
    }

    suspend fun login(email: String, password: String): Result<LoginResponse> {
        return try {
            val response = RetrofitClient.apiService.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!
                saveAuth(loginResponse.token, loginResponse.user)
                RetrofitClient.setToken(loginResponse.token)
                SocketManager.connect(loginResponse.token)
                Result.success(loginResponse)
            } else {
                val errorBody = response.errorBody()?.string() ?: "Login failed"
                Result.failure(Exception(errorBody))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun saveAuth(token: String, user: User) {
        context.dataStore.edit { prefs ->
            prefs[TOKEN_KEY] = token
            prefs[USER_KEY] = gson.toJson(user)
        }
    }

    suspend fun getSavedToken(): String? {
        return context.dataStore.data.map { prefs ->
            prefs[TOKEN_KEY]
        }.first()
    }

    suspend fun getSavedUser(): User? {
        return context.dataStore.data.map { prefs ->
            prefs[USER_KEY]?.let { json ->
                try {
                    gson.fromJson(json, User::class.java)
                } catch (e: Exception) {
                    null
                }
            }
        }.first()
    }

    suspend fun restoreSession(): Pair<String, User>? {
        val token = getSavedToken() ?: return null
        val user = getSavedUser() ?: return null
        RetrofitClient.setToken(token)
        SocketManager.connect(token)
        return Pair(token, user)
    }

    suspend fun logout() {
        context.dataStore.edit { prefs ->
            prefs.clear()
        }
        RetrofitClient.setToken(null)
        SocketManager.disconnect()
    }
}
