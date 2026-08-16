import { useState, useEffect, useMemo } from 'react';
import { BedDouble, Plus, Search, Filter, CreditCard as Edit, Trash2, Wifi, Tv, Wind, Coffee, Bath, Star, Layers, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { useHotel } from '../contexts/HotelContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, getStatusColor, getStatusLabel } from '../lib/utils';
import type { Room, RoomType } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';

const ROOM_STATUSES: Room['status'][] = ['available', 'occupied', 'dirty', 'clean', 'maintenance', 'out_of_service'];

type RoomView = 'grid' | 'board';

const BED_TYPES = ['Single', 'Double', 'Queen', 'King', 'Twin'];

const AVAILABLE_AMENITIES = [
  'WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Balcony', 'Sea View',
  'Room Service', 'Safe', 'Coffee Maker', 'Bathtub', 'Shower', 'Desk',
  'Iron', 'Hair Dryer',
];

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WiFi: <Wifi className="w-3 h-3" />,
  TV: <Tv className="w-3 h-3" />,
  'Air Conditioning': <Wind className="w-3 h-3" />,
  'Coffee Maker': <Coffee className="w-3 h-3" />,
  Bathtub: <Bath className="w-3 h-3" />,
};

const STATUS_DOT_COLORS: Record<string, string> = {
  available: 'bg-green-500',
  occupied: 'bg-blue-500',
  dirty: 'bg-red-500',
  clean: 'bg-emerald-500',
  maintenance: 'bg-gray-400',
  out_of_service: 'bg-gray-400',
};

type TabView = 'rooms' | 'room-types';

interface RoomFormData {
  number: string;
  floor: number;
  room_type_id: string;
  rate_override: number | null;
  notes: string;
}

interface RoomTypeFormData {
  name: string;
  description: string;
  base_rate: number;
  max_occupancy: number;
  bed_type: string;
  amenities: string[];
  image_url: string;
}

const defaultRoomForm: RoomFormData = {
  number: '',
  floor: 1,
  room_type_id: '',
  rate_override: null,
  notes: '',
};

const defaultRoomTypeForm: RoomTypeFormData = {
  name: '',
  description: '',
  base_rate: 0,
  max_occupancy: 2,
  bed_type: 'Queen',
  amenities: [],
  image_url: '',
};

export default function RoomsPage() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabView>('rooms');
  const [roomView, setRoomView] = useState<RoomView>('grid');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormData>(defaultRoomForm);
  const [savingRoom, setSavingRoom] = useState(false);

  const [showRoomTypeModal, setShowRoomTypeModal] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [roomTypeForm, setRoomTypeForm] = useState<RoomTypeFormData>(defaultRoomTypeForm);
  const [savingRoomType, setSavingRoomType] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'room' | 'room_type'; id: string; name: string } | null>(null);

  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);

  const fetchRooms = async () => {
    if (!currentHotel) return;
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, room_type:room_types(*)')
        .eq('hotel_id', currentHotel.id)
        .order('number');
      if (error) throw error;
      setRooms((data || []) as Room[]);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      throw err;
    }
  };

  const fetchRoomTypes = async () => {
    if (!currentHotel) return;
    try {
      const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .eq('hotel_id', currentHotel.id)
        .order('name');
      if (error) throw error;
      setRoomTypes((data || []) as RoomType[]);
    } catch (err) {
      console.error('Error fetching room types:', err);
      throw err;
    }
  };

  const fetchAll = async () => {
    if (!currentHotel) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchRooms(), fetchRoomTypes()]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rooms data');
      toast('error', 'Failed to load rooms data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentHotel) {
      fetchAll();

      const channel = supabase
        .channel(`rooms-changes-${currentHotel.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rooms',
            filter: `hotel_id=eq.${currentHotel.id}`,
          },
          () => {
            fetchRooms();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setLoading(false);
    }
  }, [currentHotel?.id]);

  const floors = useMemo(() => {
    const set = new Set(rooms.map(r => r.floor));
    return Array.from(set).sort((a, b) => a - b);
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      if (statusFilter && room.status !== statusFilter) return false;
      if (floorFilter && room.floor !== Number(floorFilter)) return false;
      if (typeFilter && room.room_type_id !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchNumber = room.number.toLowerCase().includes(q);
        const matchType = room.room_type?.name.toLowerCase().includes(q);
        if (!matchNumber && !matchType) return false;
      }
      return true;
    });
  }, [rooms, statusFilter, floorFilter, typeFilter, searchQuery]);

  const roomCountByType = useMemo(() => {
    const map: Record<string, number> = {};
    rooms.forEach(r => {
      map[r.room_type_id] = (map[r.room_type_id] || 0) + 1;
    });
    return map;
  }, [rooms]);

  const openAddRoom = () => {
    setEditingRoom(null);
    setRoomForm({ ...defaultRoomForm, room_type_id: roomTypes[0]?.id || '' });
    setShowRoomModal(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({
      number: room.number,
      floor: room.floor,
      room_type_id: room.room_type_id,
      rate_override: room.rate_override,
      notes: room.notes,
    });
    setShowRoomModal(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel) return;
    setSavingRoom(true);

    const payload = {
      hotel_id: currentHotel.id,
      number: roomForm.number.trim(),
      floor: roomForm.floor,
      room_type_id: roomForm.room_type_id,
      rate_override: roomForm.rate_override || null,
      notes: roomForm.notes.trim(),
    };

    if (editingRoom) {
      const { error } = await supabase.from('rooms').update(payload).eq('id', editingRoom.id);
      if (error) {
        toast('error', 'Failed to update room');
        setSavingRoom(false);
        return;
      }
      toast('success', `Room ${payload.number} updated`);
    } else {
      const { error } = await supabase.from('rooms').insert({ ...payload, status: 'available' as const });
      if (error) {
        toast('error', 'Failed to create room');
        setSavingRoom(false);
        return;
      }
      toast('success', `Room ${payload.number} created`);
    }

    setSavingRoom(false);
    setShowRoomModal(false);
    fetchRooms();
  };

  const handleStatusChange = async (roomId: string, newStatus: Room['status']) => {
    const { error } = await supabase.from('rooms').update({ status: newStatus }).eq('id', roomId);
    if (error) {
      toast('error', 'Failed to update status');
      return;
    }
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: newStatus } : r));
    setStatusDropdownOpen(null);
    toast('success', `Room status changed to ${getStatusLabel(newStatus)}`);
  };

  const openAddRoomType = () => {
    setEditingRoomType(null);
    setRoomTypeForm({ ...defaultRoomTypeForm });
    setShowRoomTypeModal(true);
  };

  const openEditRoomType = (rt: RoomType) => {
    setEditingRoomType(rt);
    setRoomTypeForm({
      name: rt.name,
      description: rt.description,
      base_rate: rt.base_rate,
      max_occupancy: rt.max_occupancy,
      bed_type: rt.bed_type,
      amenities: rt.amenities || [],
      image_url: rt.image_url,
    });
    setShowRoomTypeModal(true);
  };

  const handleSaveRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel) return;
    setSavingRoomType(true);

    const payload = {
      hotel_id: currentHotel.id,
      name: roomTypeForm.name.trim(),
      description: roomTypeForm.description.trim(),
      base_rate: roomTypeForm.base_rate,
      max_occupancy: roomTypeForm.max_occupancy,
      bed_type: roomTypeForm.bed_type,
      amenities: roomTypeForm.amenities,
      image_url: roomTypeForm.image_url.trim(),
    };

    if (editingRoomType) {
      const { error } = await supabase.from('room_types').update(payload).eq('id', editingRoomType.id);
      if (error) {
        toast('error', 'Failed to update room type');
        setSavingRoomType(false);
        return;
      }
      toast('success', `${payload.name} updated`);
    } else {
      const { error } = await supabase.from('room_types').insert(payload);
      if (error) {
        console.error('room_types insert error:', error);
        toast('error', 'Failed to create room type');
        setSavingRoomType(false);
        return;
      }
      toast('success', `${payload.name} created`);
    }

    setSavingRoomType(false);
    setShowRoomTypeModal(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'room') {
      const { data: activeRes, error: resCheckError } = await supabase
        .from('reservations')
        .select('id')
        .eq('room_id', deleteTarget.id)
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .limit(1);

      if (resCheckError) {
        toast('error', 'Failed to check room reservations');
        return;
      }

      if (activeRes && activeRes.length > 0) {
        toast('error', 'Cannot delete room — it has active reservations. Cancel or complete them first.');
        setDeleteTarget(null);
        return;
      }
    }

    const table = deleteTarget.type === 'room' ? 'rooms' : 'room_types';
    const { error } = await supabase.from(table).delete().eq('id', deleteTarget.id);
    if (error) {
      toast('error', `Failed to delete ${deleteTarget.type === 'room' ? 'room' : 'room type'}`);
      return;
    }
    toast('success', `${deleteTarget.name} deleted`);
    setDeleteTarget(null);
    fetchAll();
  };

  const toggleAmenity = (amenity: string) => {
    setRoomTypeForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const getRoomRate = (room: Room): number => {
    return room.rate_override ?? room.room_type?.base_rate ?? 0;
  };

  if (loading) return <LoadingSpinner size="lg" />;

  if (!currentHotel) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-gray-600 text-lg">No hotel selected</div>
        <p className="text-gray-500 text-sm mt-2">Please select a hotel to manage rooms</p>
      </div>
    );
  }

  if (error && rooms.length === 0 && roomTypes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.rooms.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Manage rooms and room types</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-gray-200">
          <div className="text-red-600 text-lg font-semibold mb-2">Error loading rooms</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchAll()}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#172e4c] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.rooms.roomManagement}</h1>
          <p className="text-sm text-gray-500 mt-1">{rooms.length} {t.rooms.roomsAcross} {roomTypes.length} {t.rooms.roomTypes}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={activeTab === 'rooms' ? openAddRoom : openAddRoomType}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'rooms' ? t.rooms.addRoom : t.rooms.addRoomType}
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'rooms'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <BedDouble className="w-4 h-4" />
              {t.rooms.roomCount}
              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{rooms.length}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('room-types')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'room-types'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              {t.rooms.roomTypeCount}
              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{roomTypes.length}</span>
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'rooms' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setRoomView('grid')}
                  className={`p-2 rounded transition-colors ${
                    roomView === 'grid'
                      ? 'bg-white text-brand-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRoomView('board')}
                  className={`p-2 rounded transition-colors ${
                    roomView === 'board'
                      ? 'bg-white text-brand-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Status Board"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="input-field"
              >
                <option value="">{t.rooms.allStatuses}</option>
                {ROOM_STATUSES.map(s => (
                  <option key={s} value={s}>{getStatusLabel(s)}</option>
                ))}
              </select>
              <select
                value={floorFilter}
                onChange={e => setFloorFilter(e.target.value)}
                className="input-field"
              >
                <option value="">{t.rooms.allFloors}</option>
                {floors.map(f => (
                  <option key={f} value={f}>Floor {f}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="input-field"
              >
                <option value="">{t.rooms.allTypes}</option>
                {roomTypes.map(rt => (
                  <option key={rt.id} value={rt.id}>{rt.name}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredRooms.length === 0 ? (
            <EmptyState
              icon={<BedDouble className="w-6 h-6" />}
              title="No rooms found"
              description={rooms.length === 0 ? 'Get started by adding your first room.' : 'Try adjusting your filters to find rooms.'}
              action={
                rooms.length === 0 ? (
                  <button onClick={openAddRoom} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Add Room
                  </button>
                ) : undefined
              }
            />
          ) : roomView === 'board' ? (
            <div className="space-y-4">
              {floors.filter(f => !floorFilter || f === Number(floorFilter)).map(floor => {
                const floorRooms = filteredRooms.filter(r => r.floor === floor);
                if (floorRooms.length === 0) return null;
                return (
                  <div key={floor} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Floor {floor}</h3>
                      <p className="text-sm text-gray-500">{floorRooms.length} rooms</p>
                    </div>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {floorRooms.map(room => {
                        const statusBgColor = {
                          available: 'bg-green-500',
                          occupied: 'bg-blue-500',
                          dirty: 'bg-red-500',
                          clean: 'bg-emerald-500',
                          maintenance: 'bg-gray-400',
                          out_of_service: 'bg-gray-400',
                        }[room.status];

                        return (
                          <div key={room.id} className="relative group">
                            <button
                              onClick={() => setStatusDropdownOpen(statusDropdownOpen === room.id ? null : room.id)}
                              className={`w-full aspect-square rounded-lg ${statusBgColor} text-white font-bold text-sm flex flex-col items-center justify-center hover:opacity-90 transition-opacity`}
                            >
                              <span className="text-lg">{room.number}</span>
                              <span className="text-xs opacity-90 mt-0.5">{room.room_type?.name}</span>
                            </button>
                            {statusDropdownOpen === room.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(null)} />
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1 min-w-max">
                                  <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100">
                                    Room {room.number}
                                  </div>
                                  {ROOM_STATUSES.filter(s => s !== room.status).map(s => (
                                    <button
                                      key={s}
                                      onClick={() => handleStatusChange(room.id, s)}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[s]}`} />
                                      {getStatusLabel(s)}
                                    </button>
                                  ))}
                                  <div className="border-t border-gray-100 mt-1 pt-1">
                                    <button
                                      onClick={() => {
                                        openEditRoom(room);
                                        setStatusDropdownOpen(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                                    >
                                      <Edit className="w-3 h-3" />
                                      Edit Room
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Status Legend</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {ROOM_STATUSES.map(status => (
                    <div key={status} className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded ${STATUS_DOT_COLORS[status]}`} />
                      <span className="text-xs text-gray-600">{getStatusLabel(status)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredRooms.map(room => (
                <div
                  key={room.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{room.number}</h3>
                      <p className="text-sm text-gray-500">{room.room_type?.name || 'Unknown Type'}</p>
                    </div>
                    <span className={`badge ${getStatusColor(room.status)}`}>
                      {getStatusLabel(room.status)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Floor</span>
                      <span className="font-medium text-gray-900">{room.floor}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{t.rooms.ratePerNight}</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(getRoomRate(room), currentHotel?.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="relative mb-3">
                    <button
                      onClick={() => setStatusDropdownOpen(statusDropdownOpen === room.id ? null : room.id)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[room.status]}`} />
                        {t.rooms.changeStatus}
                      </div>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {statusDropdownOpen === room.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(null)} />
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1">
                          {ROOM_STATUSES.filter(s => s !== room.status).map(s => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(room.id, s)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[s]}`} />
                              {getStatusLabel(s)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openEditRoom(room)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ type: 'room', id: room.id, name: `Room ${room.number}` })}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'room-types' && (
        <>
          {roomTypes.length === 0 ? (
            <EmptyState
              icon={<Layers className="w-6 h-6" />}
              title="No room types configured"
              description="Create room types to categorize your rooms with rates, amenities, and bed types."
              action={
                <button onClick={openAddRoomType} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  {t.rooms.addRoomType}
                </button>
              }
            />
          ) : (
            <div className="space-y-4">
              {roomTypes.map(rt => (
                <div
                  key={rt.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {rt.image_url && (
                      <img
                        src={rt.image_url}
                        alt={rt.name}
                        className="w-full md:w-40 h-28 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{rt.name}</h3>
                          {rt.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{rt.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => openEditRoomType(rt)}
                            className="btn-secondary"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'room_type', id: rt.id, name: rt.name })}
                            className="btn-danger"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                        <div className="stat-card">
                          <span className="text-xs text-gray-500">Base Rate</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(rt.base_rate, currentHotel?.currency)}
                          </span>
                        </div>
                        <div className="stat-card">
                          <span className="text-xs text-gray-500">Max Occupancy</span>
                          <span className="text-sm font-semibold text-gray-900">{rt.max_occupancy} guests</span>
                        </div>
                        <div className="stat-card">
                          <span className="text-xs text-gray-500">Bed Type</span>
                          <span className="text-sm font-semibold text-gray-900">{rt.bed_type}</span>
                        </div>
                        <div className="stat-card">
                          <span className="text-xs text-gray-500">Rooms</span>
                          <span className="text-sm font-semibold text-gray-900">{roomCountByType[rt.id] || 0}</span>
                        </div>
                      </div>

                      {rt.amenities && rt.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {rt.amenities.map(amenity => (
                            <span
                              key={amenity}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md"
                            >
                              {AMENITY_ICONS[amenity] || <Star className="w-3 h-3" />}
                              {amenity}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={showRoomModal}
        onClose={() => setShowRoomModal(false)}
        title={editingRoom ? `Edit Room ${editingRoom.number}` : 'Add New Room'}
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Room Number</label>
              <input
                type="text"
                value={roomForm.number}
                onChange={e => setRoomForm(prev => ({ ...prev, number: e.target.value }))}
                className="input-field"
                placeholder="101"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Floor</label>
              <input
                type="number"
                value={roomForm.floor}
                onChange={e => setRoomForm(prev => ({ ...prev, floor: parseInt(e.target.value) || 1 }))}
                className="input-field"
                min={0}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Room Type</label>
            <select
              value={roomForm.room_type_id}
              onChange={e => setRoomForm(prev => ({ ...prev, room_type_id: e.target.value }))}
              className="input-field"
              required
            >
              <option value="">Select room type</option>
              {roomTypes.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.name} ({formatCurrency(rt.base_rate, currentHotel?.currency)}/night)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rate Override (optional)</label>
            <input
              type="number"
              value={roomForm.rate_override ?? ''}
              onChange={e => setRoomForm(prev => ({ ...prev, rate_override: e.target.value ? parseFloat(e.target.value) : null }))}
              className="input-field"
              placeholder="Leave blank to use room type base rate"
              min={0}
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={roomForm.notes}
              onChange={e => setRoomForm(prev => ({ ...prev, notes: e.target.value }))}
              className="input-field"
              rows={3}
              placeholder="Special notes about this room..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowRoomModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={savingRoom} className="btn-primary">
              {savingRoom ? 'Saving...' : editingRoom ? 'Update Room' : 'Create Room'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showRoomTypeModal}
        onClose={() => setShowRoomTypeModal(false)}
        title={editingRoomType ? `Edit ${editingRoomType.name}` : 'Add New Room Type'}
        size="lg"
      >
        <form onSubmit={handleSaveRoomType} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input
                type="text"
                value={roomTypeForm.name}
                onChange={e => setRoomTypeForm(prev => ({ ...prev, name: e.target.value }))}
                className="input-field"
                placeholder="Deluxe Suite"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Base Rate</label>
              <input
                type="number"
                value={roomTypeForm.base_rate}
                onChange={e => setRoomTypeForm(prev => ({ ...prev, base_rate: parseFloat(e.target.value) || 0 }))}
                className="input-field"
                min={0}
                step="0.01"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={roomTypeForm.description}
              onChange={e => setRoomTypeForm(prev => ({ ...prev, description: e.target.value }))}
              className="input-field"
              rows={2}
              placeholder="Spacious suite with panoramic views..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Occupancy</label>
              <input
                type="number"
                value={roomTypeForm.max_occupancy}
                onChange={e => setRoomTypeForm(prev => ({ ...prev, max_occupancy: parseInt(e.target.value) || 1 }))}
                className="input-field"
                min={1}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bed Type</label>
              <select
                value={roomTypeForm.bed_type}
                onChange={e => setRoomTypeForm(prev => ({ ...prev, bed_type: e.target.value }))}
                className="input-field"
                required
              >
                {BED_TYPES.map(bt => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Image URL</label>
            <input
              type="url"
              value={roomTypeForm.image_url}
              onChange={e => setRoomTypeForm(prev => ({ ...prev, image_url: e.target.value }))}
              className="input-field"
              placeholder="https://example.com/room-image.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_AMENITIES.map(amenity => (
                <label
                  key={amenity}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    roomTypeForm.amenities.includes(amenity)
                      ? 'bg-brand-50 border-brand-300 text-brand-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={roomTypeForm.amenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    className="sr-only"
                  />
                  <span className="flex-shrink-0">
                    {AMENITY_ICONS[amenity] || <Star className="w-3 h-3" />}
                  </span>
                  <span className="text-xs font-medium">{amenity}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowRoomTypeModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={savingRoomType} className="btn-primary">
              {savingRoomType ? 'Saving...' : editingRoomType ? 'Update Room Type' : 'Create Room Type'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${deleteTarget?.name}?`}
        message={
          deleteTarget?.type === 'room_type'
            ? 'Deleting this room type will affect all rooms assigned to it. This action cannot be undone.'
            : 'This room will be permanently removed. This action cannot be undone.'
        }
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
