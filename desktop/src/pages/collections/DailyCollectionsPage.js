import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dailyCollectionService from '../../services/dailyCollectionService';
import { useToast } from '../../context/ToastContext';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BanknotesIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

const DailyCollectionsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [collections, setCollections] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [dailySummary, setDailySummary] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    collection_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'cash',
    received_from: '',
    description: '',
    reference_number: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeView, setActiveView] = useState('today'); // 'today', 'list', 'summary'

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const [collectionsRes, todayRes, summaryRes] = await Promise.all([
        dailyCollectionService.getAllCollections(params),
        dailyCollectionService.getTodaySummary(),
        dailyCollectionService.getDailySummary(params),
      ]);

      setCollections(collectionsRes.data || []);
      setTodaySummary(todayRes.data || null);
      setDailySummary(summaryRes.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await dailyCollectionService.updateCollection(editingId, formData);
        showToast('Collection updated successfully!', 'success');
      } else {
        await dailyCollectionService.createCollection(formData);
        showToast('Collection recorded successfully!', 'success');
      }
      resetForm();
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to save collection', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (collection) => {
    setEditingId(collection.id);
    setFormData({
      collection_date: collection.collection_date ? new Date(collection.collection_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      amount: collection.amount,
      payment_method: collection.payment_method || 'cash',
      received_from: collection.received_from || '',
      description: collection.description || '',
      reference_number: collection.reference_number || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await dailyCollectionService.deleteCollection(id);
      showToast('Collection deleted successfully', 'success');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete collection', 'error');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      collection_date: new Date().toISOString().split('T')[0],
      amount: '',
      payment_method: 'cash',
      received_from: '',
      description: '',
      reference_number: '',
    });
  };

  const formatCurrency = (num) => '₨ ' + parseFloat(num || 0).toLocaleString();
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PK') : '-';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Daily Collections</h1>
                <p className="text-sm text-gray-500">Track daily received amounts</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 shadow-md"
              >
                <PlusIcon className="h-4 w-4" />
                Add Collection
              </button>
              <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Today's Summary Card */}
        {todaySummary && (
          <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-6 mb-6 text-white shadow-xl">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-green-100 text-sm">Today's Collections</p>
                <p className="text-4xl font-bold mt-1">{formatCurrency(todaySummary.total_amount)}</p>
                <p className="text-green-200 text-sm mt-2">{todaySummary.total_entries || 0} entries recorded today</p>
              </div>
              <div className="bg-white/20 p-4 rounded-2xl">
                <BanknotesIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            {todaySummary.by_method && todaySummary.by_method.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {todaySummary.by_method.map((m, i) => (
                  <div key={i} className="bg-white/10 rounded-lg px-3 py-2">
                    <p className="text-xs text-green-200 capitalize">{m.payment_method}</p>
                    <p className="font-bold">{formatCurrency(m.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* View Tabs */}
        <div className="flex gap-2 mb-6">
          {['today', 'list', 'summary'].map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all capitalize ${
                activeView === view
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {view === 'today' ? "Today's Entries" : view === 'list' ? 'All Collections' : 'Daily Summary'}
            </button>
          ))}
        </div>

        {/* Date Filters for list/summary */}
        {activeView !== 'today' && (
          <div className="flex gap-3 mb-4">
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="From"
              />
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="To"
            />
          </div>
        )}

        {/* Today's Entries */}
        {activeView === 'today' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-16">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-2" />
                  <p className="text-gray-500">Loading...</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Received From</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reference</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {collections
                      .filter(c => {
                        const today = new Date().toISOString().split('T')[0];
                        const collDate = c.collection_date ? new Date(c.collection_date).toISOString().split('T')[0] : '';
                        return collDate === today;
                      })
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600 text-sm">{c.created_at ? new Date(c.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td className="px-4 py-3 text-gray-800 font-medium">{c.received_from || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                              c.payment_method === 'cash' ? 'bg-green-100 text-green-700' :
                              c.payment_method === 'cheque' ? 'bg-blue-100 text-blue-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>{c.payment_method}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-sm">{c.reference_number || '-'}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(c.amount)}</td>
                          <td className="px-4 py-3 text-gray-600 text-sm truncate max-w-[200px]">{c.description || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Edit">
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Delete">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {collections.filter(c => {
                      const today = new Date().toISOString().split('T')[0];
                      const collDate = c.collection_date ? new Date(c.collection_date).toISOString().split('T')[0] : '';
                      return collDate === today;
                    }).length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-4 py-16 text-center text-gray-500">
                          <BanknotesIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p>No collections recorded today</p>
                          <button
                            onClick={() => { resetForm(); setShowForm(true); }}
                            className="mt-3 text-primary-600 hover:text-primary-700 font-medium"
                          >
                            + Record a collection
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* All Collections List */}
        {activeView === 'list' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Received From</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reference</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {collections.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{formatDate(c.collection_date)}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{c.received_from || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          c.payment_method === 'cash' ? 'bg-green-100 text-green-700' :
                          c.payment_method === 'cheque' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>{c.payment_method}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{c.reference_number || '-'}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(c.amount)}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm truncate max-w-[200px]">{c.description || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {collections.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-16 text-center text-gray-500">No collections found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Daily Summary View */}
        {activeView === 'summary' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Entries</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Cash</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Cheque</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Bank Transfer</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dailySummary.map((day, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{formatDate(day.collection_date)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{day.total_entries}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(day.cash_total || 0)}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(day.cheque_total || 0)}</td>
                      <td className="px-4 py-3 text-right text-purple-600">{formatCurrency(day.bank_transfer_total || 0)}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800">{formatCurrency(day.total_amount)}</td>
                    </tr>
                  ))}
                  {dailySummary.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-16 text-center text-gray-500">No summary data available</td>
                    </tr>
                  )}
                </tbody>
                {dailySummary.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td className="px-4 py-3 text-gray-800">Grand Total</td>
                      <td className="px-4 py-3 text-right text-gray-600">{dailySummary.reduce((s, d) => s + (d.total_entries || 0), 0)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(dailySummary.reduce((s, d) => s + parseFloat(d.cash_total || 0), 0))}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(dailySummary.reduce((s, d) => s + parseFloat(d.cheque_total || 0), 0))}</td>
                      <td className="px-4 py-3 text-right text-purple-600">{formatCurrency(dailySummary.reduce((s, d) => s + parseFloat(d.bank_transfer_total || 0), 0))}</td>
                      <td className="px-4 py-3 text-right text-gray-800">{formatCurrency(dailySummary.reduce((s, d) => s + parseFloat(d.total_amount || 0), 0))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => resetForm()}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">
                  {editingId ? 'Edit Collection' : 'Record New Collection'}
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      value={formData.collection_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, collection_date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Received From</label>
                    <input
                      type="text"
                      value={formData.received_from}
                      onChange={(e) => setFormData(prev => ({ ...prev, received_from: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Name or source"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Cheque number, transaction ID, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Optional notes..."
                    rows="2"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={resetForm}
                    className="px-5 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 shadow-md flex items-center gap-2">
                    {submitting && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                    {editingId ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DailyCollectionsPage;
