package com.movemate.app.home

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.movemate.app.databinding.ItemRoomCardBinding
import com.movemate.app.model.Room

class RoomAdapter(
    private val onRoomClick: (Room) -> Unit,
    private val onRoomDelete: (Room) -> Unit
) : ListAdapter<Room, RoomAdapter.RoomViewHolder>(DiffCallback) {

    companion object DiffCallback : DiffUtil.ItemCallback<Room>() {
        override fun areItemsTheSame(old: Room, new: Room) = old.id == new.id
        override fun areContentsTheSame(old: Room, new: Room) = old == new
    }

    inner class RoomViewHolder(private val binding: ItemRoomCardBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(room: Room) {
            binding.tvRoomIcon.text = room.icon
            binding.tvRoomName.text = room.name
            binding.root.setOnClickListener { onRoomClick(room) }
            binding.btnDeleteRoom.setOnLongClickListener {
                onRoomDelete(room)
                true
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RoomViewHolder {
        val binding = ItemRoomCardBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return RoomViewHolder(binding)
    }

    override fun onBindViewHolder(holder: RoomViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
}
