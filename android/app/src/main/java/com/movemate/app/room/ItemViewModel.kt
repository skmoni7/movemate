package com.movemate.app.room

import androidx.lifecycle.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.*
import com.google.firebase.firestore.ktx.toObject
import com.google.firebase.storage.FirebaseStorage
import com.movemate.app.model.Item
import com.movemate.app.model.VALUE_BANDS
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class ItemViewModel(private val roomId: String) : ViewModel() {

    private val db = FirebaseFirestore.getInstance()
    private val storage = FirebaseStorage.getInstance()
    private val uid get() = FirebaseAuth.getInstance().currentUser?.uid ?: ""
    private val itemsRef get() = db.collection("users").document(uid)
        .collection("rooms").document(roomId).collection("items")
    private val roomRef get() = db.collection("users").document(uid)
        .collection("rooms").document(roomId)

    private val _items = MutableLiveData<List<Item>>(emptyList())
    val items: LiveData<List<Item>> = _items

    private val _roomName = MutableLiveData<String?>(null)
    val roomName: LiveData<String?> = _roomName

    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error

    private val _loading = MutableLiveData(true)
    val loading: LiveData<Boolean> = _loading

    private var listener: ListenerRegistration? = null

    init {
        listenItems()
        loadRoomName()
    }

    private fun listenItems() {
        listener = itemsRef.addSnapshotListener { snap, e ->
            if (e != null) { _error.value = e.message; return@addSnapshotListener }
            _items.value = snap?.documents?.mapNotNull { it.toObject<Item>()?.copy(id = it.id) } ?: emptyList()
            _loading.value = false
        }
    }

    private fun loadRoomName() {
        viewModelScope.launch {
            try {
                val doc = roomRef.get().await()
                _roomName.value = doc.getString("name")
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    fun getItem(itemId: String): LiveData<Item?> {
        val result = MutableLiveData<Item?>(null)
        viewModelScope.launch {
            try {
                val doc = itemsRef.document(itemId).get().await()
                result.value = doc.toObject<Item>()?.copy(id = doc.id)
            } catch (e: Exception) {
                result.value = null
            }
        }
        return result
    }

    fun addItem(
        name: String,
        quantity: Int,
        valueBand: String,
        boxNumber: String,
        notes: String
    ) {
        val data = hashMapOf(
            "name" to name,
            "quantity" to quantity,
            "valueBand" to valueBand,
            "boxNumber" to boxNumber,
            "notes" to notes,
            "leaveBehind" to false,
            "photoURL" to "",
            "photoPath" to ""
        )
        viewModelScope.launch {
            try { itemsRef.add(data).await() }
            catch (e: Exception) { _error.value = e.message }
        }
    }

    fun updateItem(
        itemId: String,
        name: String,
        quantity: Int,
        valueBand: String,
        boxNumber: String,
        notes: String
    ) {
        val data = mapOf(
            "name" to name,
            "quantity" to quantity,
            "valueBand" to valueBand,
            "boxNumber" to boxNumber,
            "notes" to notes
        )
        viewModelScope.launch {
            try { itemsRef.document(itemId).update(data).await() }
            catch (e: Exception) { _error.value = e.message }
        }
    }

    fun deleteItem(itemId: String) {
        viewModelScope.launch {
            try { itemsRef.document(itemId).delete().await() }
            catch (e: Exception) { _error.value = e.message }
        }
    }

    fun getSummary(): Map<String, Any> {
        val all = _items.value ?: emptyList()
        val moving = all.filter { !it.leaveBehind }
        return mapOf(
            "totalItems" to all.sumOf { it.quantity },
            "movingItems" to moving.sumOf { it.quantity },
            "valueBands" to VALUE_BANDS.map { band ->
                band.short to moving.filter { it.valueBand == VALUE_BANDS.indexOf(band).toString() }.sumOf { it.quantity }
            }.toMap()
        )
    }

    override fun onCleared() { super.onCleared(); listener?.remove() }

    class Factory(private val roomId: String) : ViewModelProvider.Factory {
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            @Suppress("UNCHECKED_CAST")
            return ItemViewModel(roomId) as T
        }
    }
}
