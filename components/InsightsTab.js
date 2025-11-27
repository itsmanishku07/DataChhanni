'use client';

export default function InsightsTab({ 
  collections, 
  insightsCollection, 
  setInsightsCollection, 
  insights, 
  loadingInsights, 
  handleGetInsights 
}) {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-6">🧠 AI-Powered Data Insights</h2>
      <div className="space-y-6">
        <div className="flex gap-4">
          <select 
            value={insightsCollection} 
            onChange={(e) => setInsightsCollection(e.target.value)} 
            className="flex-1 p-4 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="" className="bg-slate-800">Select a collection...</option>
            {collections.map(col => (<option key={col} value={col} className="bg-slate-800">{col}</option>))}
          </select>
          <button 
            onClick={handleGetInsights} 
            disabled={loadingInsights}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-lg disabled:opacity-50"
          >
            {loadingInsights ? 'Analyzing...' : 'Analyze Data'}
          </button>
        </div>

        {insights && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3">📊 Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-300">{insights.summary?.totalRecords}</p>
                  <p className="text-sm text-purple-200">Total Records</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-300">{insights.summary?.totalFields}</p>
                  <p className="text-sm text-purple-200">Fields</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-300">{insights.summary?.dataQualityScore}</p>
                  <p className="text-sm text-purple-200">Quality Score</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {insights.insights?.map((insight, idx) => (
                <div key={idx} className="bg-white/5 p-5 rounded-xl border border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-white">
                      {insight.type === 'numeric' ? '🔢' : insight.type === 'text' ? '📝' : '⚠️'} {insight.field}
                    </h4>
                    <span className="px-3 py-1 bg-purple-600/30 text-purple-200 rounded-lg text-xs font-medium">
                      {insight.type}
                    </span>
                  </div>
                  
                  {insight.stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      {Object.entries(insight.stats).map(([key, value]) => (
                        <div key={key} className="bg-slate-900/50 p-2 rounded">
                          <p className="text-xs text-purple-300">{key}</p>
                          <p className="text-sm font-semibold text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {insight.recommendation && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <p className="text-yellow-200 text-sm">💡 {insight.recommendation}</p>
                    </div>
                  )}
                  
                  {insight.message && (
                    <p className="text-orange-300 text-sm">{insight.message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
