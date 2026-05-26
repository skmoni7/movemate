package com.movemate.app.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.ServerTimestamp

data class Room(
    @DocumentId val id: String = "",
    val name: String = "",
    val icon: String = "📦",
    val userId: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null
)

data class Item(
    @DocumentId val id: String = "",
    val name: String = "",
    val quantity: Int = 1,
    val valueBand: Int = 0,
    val boxNumber: String = "NA",
    val notes: String = "",
    val leaveBehind: Boolean = false,
    val photoURL: String? = null,
    val photoPath: String? = null,
    @ServerTimestamp val createdAt: Timestamp? = null
)

// Value bands matching the web app
data class ValueBand(
    val label: String,
    val short: String,
    val min: Int,
    val max: Int
)

val VALUE_BANDS = listOf(
    ValueBand("\$0 \u2013 \$300", "<\$300", 0, 300),
    ValueBand("\$300 \u2013 \$750", "\$300-750", 300, 750),
    ValueBand("\$750 \u2013 \$1,200", "\$750-1.2k", 750, 1200),
    ValueBand("\$1,200+", "\$1.2k+", 1200, Int.MAX_VALUE)
)

// Room suggestions matching the web app (Living Room uses sofa+TV icon)
data class RoomSuggestion(val name: String, val icon: String)

val ROOM_SUGGESTIONS = listOf(
    RoomSuggestion("Living Room", "🛋️"),
    RoomSuggestion("Kitchen", "🍳"),
    RoomSuggestion("Dining Room", "🍽️"),
    RoomSuggestion("Primary Bedroom", "🛏️"),
    RoomSuggestion("Kids Bedroom", "🫗"),
    RoomSuggestion("Guest Room", "🛏️"),
    RoomSuggestion("Bathroom", "🛀"),
    RoomSuggestion("Home Office", "🖥️"),
    RoomSuggestion("Garage", "🚗"),
    RoomSuggestion("Basement", "🧰"),
    RoomSuggestion("Attic", "🏠"),
    RoomSuggestion("Patio / Balcony", "🌿"),
    RoomSuggestion("Laundry Room", "🧹"),
    RoomSuggestion("Storage", "📦"),
    RoomSuggestion("Miscellaneous", "➕")
)
