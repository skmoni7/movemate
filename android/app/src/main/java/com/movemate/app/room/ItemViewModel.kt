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

    private val _items = MutableLiveData<List<Item>>(emptyList())
    val items: LiveData<List<Item>> = _items

    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error

    private val _loading = MutableLiveData(true)
    val loading: LiveData<Boolean> = _loading

    private var listener: ListenerRegistration? = null

    init { listenToItems() }

    private fun listenToItems() {
        listener = itemsRef
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .addSnapshotListener { snap, e ->
                if (e != null) { _error.value = e.message; _loading.value = false; return@addSnapshotListener }
                _items.value = snap?.documents?.mapNotNull { it.toObject<Item>() } ?: emptyList()
                _loading.value = false
            }
    }

    fun addItem(item: Item) {
        viewModelScope.launch {
            try {
                val data = itemToMap(item) + mapOf("createdAt" to FieldValue.serverTimestamp())
                itemsRef.add(data).await()
            } catch (e: Exception) { _error.value = e.message }
        }
    }

    fun updateItem(item: Item) {
        viewModelScope.launch {
            try {
                itemsRef.document(item.id).update(itemToMap(item)).await()
            } catch (e: Exception) { _error.value = e.message }
        }
    }

    fun deleteItem(item: Item) {
        viewModelScope.launch {
            try {
                // Delete photo from Storage if exists
                item.photoPath?.let { storage.reference.child(it).delete().await() }
                itemsRef.document(item.id).delete().await()
            } catch (e: Exception) { _error.value = e.message }
        }
    }

    private fun itemToMap(item: Item): Map<String, Any?> = mapOf(
        "name" to item.name,
        "quantity" to item.quantity,
        "valueBand" to item.valueBand,
        "boxNumber" to item.boxNumber,
        "notes" to item.notes,
        "leaveBehind" to item.leaveBehind,
        "photoURL" to item.photoURL,
        "photoPath" to item.photoPath
    )

    // Summary stats — total value bands and leave-behind counts
    fun getSummary(): Map<String, Any> {
        val all = _items.value ?: emptyList()
        val moving = all.filter { !it.leaveBehind }
        return mapOf(
            "totalItems" to all.sumOf { it.quantity },
            "movingItems" to moving.sumOf { it.quantity },
            "valueBands" to VALUE_BANDS.map { band ->
                band.short to moving.filter { it.valueBand == VALUE_BANDS.indexOf(band) }.sumOf { it.quantity }
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
