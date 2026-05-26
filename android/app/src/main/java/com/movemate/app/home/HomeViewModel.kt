package com.movemate.app.home

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.ktx.toObject
import com.movemate.app.model.Room
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class HomeViewModel : ViewModel() {

    private val db = FirebaseFirestore.getInstance()
    private val uid get() = FirebaseAuth.getInstance().currentUser?.uid ?: ""
    private val roomsRef get() = db.collection("users").document(uid).collection("rooms")

    private val _rooms = MutableLiveData<List<Room>>(emptyList())
    val rooms: LiveData<List<Room>> = _rooms

    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error

    private val _loading = MutableLiveData(true)
    val loading: LiveData<Boolean> = _loading

    private var listenerRegistration: com.google.firebase.firestore.ListenerRegistration? = null

    init {
        listenToRooms()
    }

    private fun listenToRooms() {
        listenerRegistration = roomsRef
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, e ->
                if (e != null) {
                    _error.value = e.message
                    _loading.value = false
                    return@addSnapshotListener
                }
                val list = snapshot?.documents?.mapNotNull { it.toObject<Room>() } ?: emptyList()
                _rooms.value = list
                _loading.value = false
            }
    }

    fun addRoom(name: String, icon: String) {
        viewModelScope.launch {
            try {
                val room = hashMapOf(
                    "name" to name,
                    "icon" to icon,
                    "userId" to uid,
                    "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                )
                roomsRef.add(room).await()
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }

    fun deleteRoom(roomId: String) {
        viewModelScope.launch {
            try {
                roomsRef.document(roomId).delete().await()
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        listenerRegistration?.remove()
    }
}
