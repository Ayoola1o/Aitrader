import React, { useState } from 'react';
import { BotConfig } from '@/lib/features/engine';
import { MarketSnapshot } from '@/types/trading';
import { AlertTriangle } from 'lucide-react';

/**
 * TerminalWorkspace – a professional three‑column quantitative trading workstation.
 * All displayed data must be bound to application state; placeholders are provided
 * for the actual selectors (e.g., useAppState, Redux, or Context). The component
 * follows the dark‑navy / cyan aesthetic defined in globals.css.
 */
export const TerminalWorkspace: React.FC = () => {
  // ----- Application state placeholders (replace with real selectors) -----
  const activeBot: BotConfig | null = null; // e.g., useAppState(state => state.activeBot)
  const market: MarketSnapshot | null = null; // e.g., useAppState(state => state.marketSnapshot)
  const connectionStatus = {
    connected: false,
    latencyMs: 0,
    dataQuality: 'UNKNOWN' as const,
  };
  const equity = 0; // paper equity
  const systemState = 'IDLE'; // or RUNNING, PAUSED

  // ----- Tab management for lower workspace -----
  const tabs = ['Positions', 'Orders', 'Order Book', 'Time & Sales', 'Executions', 'Terminal Logs'] as const;
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>(tabs[0]);

  // ----- Progressive disclosure helpers -----
  const [showAIDetails, setShowAIDetails] = useState(false);
  const [showRiskDetails, setShowRiskDetails] = useState(false);

  // ----- Render helpers -----
  const renderLeftSidebar = () => (
    <div className="flex flex-col h-full p-2 space-y-3 bg-[#0a0e2c] text-cyan-100 overflow-y-auto" style={{ width: '20%' }}>
      <div className="border-b pb-2">
        <h3 className="text-sm font-semibold">Active Bot</h3>
        {activeBot ? (
          <div className="mt-1 text-xs">
            <div><strong>Name:</strong> {activeBot.name}</div>
            <div><strong>Symbol:</strong> {activeBot.symbol}</div>
            <div><strong>Mode:</strong> {activeBot.appMode}</div>
          </div>
        ) : (
          <span className="text-gray-500">No bot selected</span>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold">Market Context</h3>
        {market ? (
          <div className="mt-1 text-xs">
            <div><strong>Price:</strong> ${market.price.toLocaleString()}</div>
            <div><strong>Bid / Ask:</strong> {market.bid.toFixed(2)} / {market.ask.toFixed(2)}</div>
            <div><strong>Spread:</strong> {(market.spread).toFixed(4)}</div>
          </div>
        ) : (
          <span className="text-gray-500">No market data</span>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold">System Context</h3>
        <ul className="mt-1 text-xs list-disc list-inside">
          <li>Connection: {connectionStatus.connected ? '🟢 Online' : '🔴 Offline'}</li>
          <li>Latency: {connectionStatus.latencyMs} ms</li>
          <li>Data Quality: {connectionStatus.dataQuality}</li>
        </ul>
      </div>
    </div>
  );

  const renderCenterChart = () => (
    <div className="flex flex-col h-full bg-[#0a0e2c]" style={{ width: '60%' }}>
      <div className="flex-1 border-b border-cyan-800 overflow-hidden">
        {/* Primary chart placeholder – replace with <Chart/> component */}
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          <span className="text-sm">[Primary Chart – largest visual element]</span>
        </div>
      </div>
      {/* Lower workspace tabs */}
      <div className="flex flex-col h-48 bg-[#0b112e]">
        <div className="flex border-b border-cyan-800">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`px-3 py-1 text-xs ${activeTab === tab ? 'bg-cyan-700 text-white' : 'bg-[#0b112e] text-gray-400'} focus:outline-none`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-2 text-xs text-gray-200">
          {/* Content for each tab – replace with real components */}
          {activeTab === 'Positions' && <div>Positions list (from state)</div>}
          {activeTab === 'Orders' && <div>Open orders (from state)</div>}
          {activeTab === 'Order Book' && <div>Order book depth chart</div>}
          {activeTab === 'Time & Sales' && <div>Tick‑by‑tick tape</div>}
          {activeTab === 'Executions' && <div>Execution report</div>}
          {activeTab === 'Terminal Logs' && <div>Application logs</div>}
        </div>
      </div>
    </div>
  );

  const renderRightSidebar = () => (
    <div className="flex flex-col h-full p-2 space-y-3 bg-[#0a0e2c] text-cyan-100 overflow-y-auto" style={{ width: '20%' }}>
      {/* AI Decision Section */}
      <div className="border-b pb-2">
        <h3 className="text-sm font-semibold flex items-center gap-1">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> AI Decision
        </h3>
        <div className="mt-1 text-xs">
          {/* Bind to AI decision state */}
          <div>Action: <span className="font-medium">[BUY/SELL/NONE]</span></div>
          <div>Confidence: <span className="font-medium">[%]</span></div>
          <button className="mt-1 text-xs underline" onClick={() => setShowAIDetails(!showAIDetails)}>
            {showAIDetails ? 'Hide details' : 'Show reasoning'}
          </button>
          {showAIDetails && (
            <div className="mt-1 p-1 bg-[#0b112e] rounded">
              {/* Detailed LLM explanation */}
              <em>AI rationale goes here – sourced from state.</em>
            </div>
          )}
        </div>
      </div>
      {/* Risk Gate Section */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-1">
          <AlertTriangle className="w-4 h-4 text-red-500" /> Risk Gate
        </h3>
        <div className="mt-1 text-xs">
          {/* Bind to deterministic risk‑gate evaluation */}
          <div>Status: <span className="font-medium">[PASS/FAIL]</span></div>
          <button className="mt-1 text-xs underline" onClick={() => setShowRiskDetails(!showRiskDetails)}>
            {showRiskDetails ? 'Hide details' : 'Show criteria'}
          </button>
          {showRiskDetails && (
            <div className="mt-1 p-1 bg-[#0b112e] rounded">
              {/* Risk‑gate parameters (drawdown, max order size, etc.) */}
              <em>Risk parameters from state.</em>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStatusBar = () => (
    <div className="flex justify-between items-center px-4 py-1 bg-[#05071a] text-xs text-gray-400 border-t border-cyan-800">
      <span>Connection: {connectionStatus.connected ? 'Online' : 'Offline'}</span>
      <span>Latency: {connectionStatus.latencyMs} ms</span>
      <span>Data Quality: {connectionStatus.dataQuality}</span>
      <span>Paper Equity: ${equity.toLocaleString()}</span>
      <span>System: {systemState}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#0a0e2c] text-cyan-100">
      <div className="flex flex-1 overflow-hidden">
        {renderLeftSidebar()}
        {renderCenterChart()}
        {renderRightSidebar()}
      </div>
      {renderStatusBar()}
    </div>
  );
};
