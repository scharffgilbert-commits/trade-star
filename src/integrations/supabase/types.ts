export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_strand_analyses: {
        Row: {
          ai_model: string | null
          analysis_date: string
          analysis_text: string | null
          confidence: number | null
          created_at: string | null
          direction: string | null
          id: number
          key_findings: Json | null
          scores: Json | null
          strand_type: string
          symbol: string
        }
        Insert: {
          ai_model?: string | null
          analysis_date: string
          analysis_text?: string | null
          confidence?: number | null
          created_at?: string | null
          direction?: string | null
          id?: number
          key_findings?: Json | null
          scores?: Json | null
          strand_type: string
          symbol: string
        }
        Update: {
          ai_model?: string | null
          analysis_date?: string
          analysis_text?: string | null
          confidence?: number | null
          created_at?: string | null
          direction?: string | null
          id?: number
          key_findings?: Json | null
          scores?: Json | null
          strand_type?: string
          symbol?: string
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          api_name: string
          call_date: string
          calls_count: number
          created_at: string | null
          id: number
          last_call_at: string | null
          max_calls_per_day: number
        }
        Insert: {
          api_name?: string
          call_date?: string
          calls_count?: number
          created_at?: string | null
          id?: number
          last_call_at?: string | null
          max_calls_per_day?: number
        }
        Update: {
          api_name?: string
          call_date?: string
          calls_count?: number
          created_at?: string | null
          id?: number
          last_call_at?: string | null
          max_calls_per_day?: number
        }
        Relationships: []
      }
      api_usage_log: {
        Row: {
          api_name: string
          called_at: string | null
          endpoint: string | null
          error_message: string | null
          http_status: number | null
          id: number
          response_time_ms: number | null
          success: boolean | null
          symbol: string | null
        }
        Insert: {
          api_name?: string
          called_at?: string | null
          endpoint?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: number
          response_time_ms?: number | null
          success?: boolean | null
          symbol?: string | null
        }
        Update: {
          api_name?: string
          called_at?: string | null
          endpoint?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: number
          response_time_ms?: number | null
          success?: boolean | null
          symbol?: string | null
        }
        Relationships: []
      }
      auto_trade_config: {
        Row: {
          account_id: number
          allowed_directions: string[] | null
          allowed_symbols: string[] | null
          created_at: string
          id: number
          is_enabled: boolean
          mode: string
          trading_hours_end: string | null
          trading_hours_start: string | null
          updated_at: string
        }
        Insert: {
          account_id: number
          allowed_directions?: string[] | null
          allowed_symbols?: string[] | null
          created_at?: string
          id?: number
          is_enabled?: boolean
          mode?: string
          trading_hours_end?: string | null
          trading_hours_start?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: number
          allowed_directions?: string[] | null
          allowed_symbols?: string[] | null
          created_at?: string
          id?: number
          is_enabled?: boolean
          mode?: string
          trading_hours_end?: string | null
          trading_hours_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_trade_config_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "demo_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_snapshots: {
        Row: {
          account_id: number
          balance: number
          created_at: string
          cumulative_pnl: number
          daily_pnl: number
          equity: number
          id: number
          open_positions_count: number
          snapshot_date: string
        }
        Insert: {
          account_id: number
          balance: number
          created_at?: string
          cumulative_pnl?: number
          daily_pnl?: number
          equity: number
          id?: number
          open_positions_count?: number
          snapshot_date: string
        }
        Update: {
          account_id?: number
          balance?: number
          created_at?: string
          cumulative_pnl?: number
          daily_pnl?: number
          equity?: number
          id?: number
          open_positions_count?: number
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "demo_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      croc_ice_signals: {
        Row: {
          created_at: string | null
          direction: string
          dna_line: number | null
          dot_color: string | null
          entry_type: string | null
          expiry_date: string | null
          filter_alignment: Json | null
          filter_status: Json | null
          id: number
          is_active: boolean | null
          is_reversal_signal: boolean | null
          is_trailing_signal: boolean | null
          is_triggered: boolean | null
          metadata: Json | null
          premium_override: boolean | null
          setup_source: string | null
          signal_date: string
          signal_strength: number | null
          signal_type: string
          stop_price: number | null
          symbol: string
          take_profit_1r: number | null
          trigger_price: number | null
        }
        Insert: {
          created_at?: string | null
          direction: string
          dna_line?: number | null
          dot_color?: string | null
          entry_type?: string | null
          expiry_date?: string | null
          filter_alignment?: Json | null
          filter_status?: Json | null
          id?: never
          is_active?: boolean | null
          is_reversal_signal?: boolean | null
          is_trailing_signal?: boolean | null
          is_triggered?: boolean | null
          metadata?: Json | null
          premium_override?: boolean | null
          setup_source?: string | null
          signal_date: string
          signal_strength?: number | null
          signal_type: string
          stop_price?: number | null
          symbol: string
          take_profit_1r?: number | null
          trigger_price?: number | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          dna_line?: number | null
          dot_color?: string | null
          entry_type?: string | null
          expiry_date?: string | null
          filter_alignment?: Json | null
          filter_status?: Json | null
          id?: never
          is_active?: boolean | null
          is_reversal_signal?: boolean | null
          is_trailing_signal?: boolean | null
          is_triggered?: boolean | null
          metadata?: Json | null
          premium_override?: boolean | null
          setup_source?: string | null
          signal_date?: string
          signal_strength?: number | null
          signal_type?: string
          stop_price?: number | null
          symbol?: string
          take_profit_1r?: number | null
          trigger_price?: number | null
        }
        Relationships: []
      }
      daily_pipeline_status: {
        Row: {
          completed_at: string | null
          error_details: Json | null
          id: number
          metadata: Json | null
          retry_count: number | null
          run_date: string
          started_at: string | null
          status: string
          step_name: string
          step_order: number
          symbols_completed: number | null
          symbols_failed: number | null
          symbols_total: number | null
        }
        Insert: {
          completed_at?: string | null
          error_details?: Json | null
          id?: number
          metadata?: Json | null
          retry_count?: number | null
          run_date?: string
          started_at?: string | null
          status?: string
          step_name: string
          step_order: number
          symbols_completed?: number | null
          symbols_failed?: number | null
          symbols_total?: number | null
        }
        Update: {
          completed_at?: string | null
          error_details?: Json | null
          id?: number
          metadata?: Json | null
          retry_count?: number | null
          run_date?: string
          started_at?: string | null
          status?: string
          step_name?: string
          step_order?: number
          symbols_completed?: number | null
          symbols_failed?: number | null
          symbols_total?: number | null
        }
        Relationships: []
      }
      demo_accounts: {
        Row: {
          account_name: string
          created_at: string
          current_balance: number
          id: number
          initial_balance: number
          is_active: boolean
          losing_trades: number
          max_drawdown_percent: number
          peak_balance: number
          reserved_balance: number
          total_pnl: number
          total_pnl_percent: number
          total_trades: number
          updated_at: string
          user_id: string | null
          winning_trades: number
        }
        Insert: {
          account_name?: string
          created_at?: string
          current_balance?: number
          id?: number
          initial_balance?: number
          is_active?: boolean
          losing_trades?: number
          max_drawdown_percent?: number
          peak_balance?: number
          reserved_balance?: number
          total_pnl?: number
          total_pnl_percent?: number
          total_trades?: number
          updated_at?: string
          user_id?: string | null
          winning_trades?: number
        }
        Update: {
          account_name?: string
          created_at?: string
          current_balance?: number
          id?: number
          initial_balance?: number
          is_active?: boolean
          losing_trades?: number
          max_drawdown_percent?: number
          peak_balance?: number
          reserved_balance?: number
          total_pnl?: number
          total_pnl_percent?: number
          total_trades?: number
          updated_at?: string
          user_id?: string | null
          winning_trades?: number
        }
        Relationships: []
      }
      demo_positions: {
        Row: {
          account_id: number
          closed_at: string | null
          created_at: string
          current_price: number | null
          decision_id: number | null
          entry_price: number
          entry_type: string | null
          exit_price: number | null
          holding_days: number | null
          id: number
          notes: string | null
          opened_at: string
          original_quantity: number | null
          parent_position_id: number | null
          partial_close_at_1r: boolean | null
          partial_close_price: number | null
          pending_entry_price: number | null
          pnl_amount: number | null
          pnl_percent: number | null
          position_status: string
          position_type: string
          pyramid_level: number | null
          quantity: number
          risk_1r_amount: number | null
          setup_name: string | null
          signal_source: string | null
          stop_loss: number | null
          stop_loss_hard: number | null
          stop_loss_soft: number | null
          symbol: string
          take_profit_1: number | null
          take_profit_2: number | null
          take_profit_3: number | null
          trade_cost: number
          trade_style: string | null
          trailing_stop_activated: boolean | null
          trailing_stop_highest: number | null
          trailing_stop_lowest: number | null
          trailing_stop_percent: number | null
          trailing_stop_price: number | null
          trailing_stop_senkou: number | null
          trailing_stop_type: string | null
          trigger_source: string
          updated_at: string
        }
        Insert: {
          account_id: number
          closed_at?: string | null
          created_at?: string
          current_price?: number | null
          decision_id?: number | null
          entry_price: number
          entry_type?: string | null
          exit_price?: number | null
          holding_days?: number | null
          id?: number
          notes?: string | null
          opened_at?: string
          original_quantity?: number | null
          parent_position_id?: number | null
          partial_close_at_1r?: boolean | null
          partial_close_price?: number | null
          pending_entry_price?: number | null
          pnl_amount?: number | null
          pnl_percent?: number | null
          position_status?: string
          position_type: string
          pyramid_level?: number | null
          quantity: number
          risk_1r_amount?: number | null
          setup_name?: string | null
          signal_source?: string | null
          stop_loss?: number | null
          stop_loss_hard?: number | null
          stop_loss_soft?: number | null
          symbol: string
          take_profit_1?: number | null
          take_profit_2?: number | null
          take_profit_3?: number | null
          trade_cost?: number
          trade_style?: string | null
          trailing_stop_activated?: boolean | null
          trailing_stop_highest?: number | null
          trailing_stop_lowest?: number | null
          trailing_stop_percent?: number | null
          trailing_stop_price?: number | null
          trailing_stop_senkou?: number | null
          trailing_stop_type?: string | null
          trigger_source?: string
          updated_at?: string
        }
        Update: {
          account_id?: number
          closed_at?: string | null
          created_at?: string
          current_price?: number | null
          decision_id?: number | null
          entry_price?: number
          entry_type?: string | null
          exit_price?: number | null
          holding_days?: number | null
          id?: number
          notes?: string | null
          opened_at?: string
          original_quantity?: number | null
          parent_position_id?: number | null
          partial_close_at_1r?: boolean | null
          partial_close_price?: number | null
          pending_entry_price?: number | null
          pnl_amount?: number | null
          pnl_percent?: number | null
          position_status?: string
          position_type?: string
          pyramid_level?: number | null
          quantity?: number
          risk_1r_amount?: number | null
          setup_name?: string | null
          signal_source?: string | null
          stop_loss?: number | null
          stop_loss_hard?: number | null
          stop_loss_soft?: number | null
          symbol?: string
          take_profit_1?: number | null
          take_profit_2?: number | null
          take_profit_3?: number | null
          trade_cost?: number
          trade_style?: string | null
          trailing_stop_activated?: boolean | null
          trailing_stop_highest?: number | null
          trailing_stop_lowest?: number | null
          trailing_stop_percent?: number | null
          trailing_stop_price?: number | null
          trailing_stop_senkou?: number | null
          trailing_stop_type?: string | null
          trigger_source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_positions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "demo_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_transactions: {
        Row: {
          account_id: number
          amount: number
          balance_after: number
          created_at: string
          id: number
          notes: string | null
          position_id: number | null
          price: number
          quantity: number
          symbol: string
          transaction_type: string
        }
        Insert: {
          account_id: number
          amount: number
          balance_after: number
          created_at?: string
          id?: number
          notes?: string | null
          position_id?: number | null
          price: number
          quantity: number
          symbol: string
          transaction_type: string
        }
        Update: {
          account_id?: number
          amount?: number
          balance_after?: number
          created_at?: string
          id?: number
          notes?: string | null
          position_id?: number | null
          price?: number
          quantity?: number
          symbol?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "demo_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_transactions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "demo_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      detected_setups: {
        Row: {
          confidence: number | null
          created_at: string | null
          crv_hard: number | null
          crv_soft: number | null
          detection_date: string
          direction: string
          entry_price: number | null
          entry_type: string
          expires_at: string | null
          filter_alignment: Json | null
          id: number
          is_active: boolean | null
          is_triggered: boolean | null
          notes: string | null
          profit_1: number | null
          profit_2: number | null
          profit_3: number | null
          setup_name: string
          stop_hard: number | null
          stop_soft: number | null
          symbol: string
          triggered_at: string | null
          triggering_signals: Json | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          crv_hard?: number | null
          crv_soft?: number | null
          detection_date: string
          direction: string
          entry_price?: number | null
          entry_type?: string
          expires_at?: string | null
          filter_alignment?: Json | null
          id?: number
          is_active?: boolean | null
          is_triggered?: boolean | null
          notes?: string | null
          profit_1?: number | null
          profit_2?: number | null
          profit_3?: number | null
          setup_name: string
          stop_hard?: number | null
          stop_soft?: number | null
          symbol: string
          triggered_at?: string | null
          triggering_signals?: Json | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          crv_hard?: number | null
          crv_soft?: number | null
          detection_date?: string
          direction?: string
          entry_price?: number | null
          entry_type?: string
          expires_at?: string | null
          filter_alignment?: Json | null
          id?: number
          is_active?: boolean | null
          is_triggered?: boolean | null
          notes?: string | null
          profit_1?: number | null
          profit_2?: number | null
          profit_3?: number | null
          setup_name?: string
          stop_hard?: number | null
          stop_soft?: number | null
          symbol?: string
          triggered_at?: string | null
          triggering_signals?: Json | null
        }
        Relationships: []
      }
      elliott_wave_analysis: {
        Row: {
          ai_analysis: string | null
          ai_model: string | null
          ai_raw_response: string | null
          alt_confidence: number | null
          alt_direction: string | null
          alt_wave: string | null
          analysis_date: string
          created_at: string | null
          elliott_score: number | null
          fib_resistance_1: number | null
          fib_resistance_2: number | null
          fib_support_1: number | null
          fib_support_2: number | null
          id: number
          invalidation_price: number | null
          primary_confidence: number | null
          primary_direction: string | null
          primary_wave: string | null
          symbol: string
        }
        Insert: {
          ai_analysis?: string | null
          ai_model?: string | null
          ai_raw_response?: string | null
          alt_confidence?: number | null
          alt_direction?: string | null
          alt_wave?: string | null
          analysis_date: string
          created_at?: string | null
          elliott_score?: number | null
          fib_resistance_1?: number | null
          fib_resistance_2?: number | null
          fib_support_1?: number | null
          fib_support_2?: number | null
          id?: number
          invalidation_price?: number | null
          primary_confidence?: number | null
          primary_direction?: string | null
          primary_wave?: string | null
          symbol: string
        }
        Update: {
          ai_analysis?: string | null
          ai_model?: string | null
          ai_raw_response?: string | null
          alt_confidence?: number | null
          alt_direction?: string | null
          alt_wave?: string | null
          analysis_date?: string
          created_at?: string | null
          elliott_score?: number | null
          fib_resistance_1?: number | null
          fib_resistance_2?: number | null
          fib_support_1?: number | null
          fib_support_2?: number | null
          id?: number
          invalidation_price?: number | null
          primary_confidence?: number | null
          primary_direction?: string | null
          primary_wave?: string | null
          symbol?: string
        }
        Relationships: [
          {
            foreignKeyName: "elliott_wave_analysis_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "symbols_master"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "elliott_wave_analysis_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "v_active_symbols"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "elliott_wave_analysis_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "v_dashboard_cards"
            referencedColumns: ["symbol"]
          },
        ]
      }
      lochstreifen_state: {
        Row: {
          candle_color: string
          cloud_color: string
          cloud_days: number | null
          created_at: string | null
          date: string
          ice_deluxe: string | null
          id: number
          metadata: Json | null
          setter: string
          setter_days: number | null
          status: string
          status_days: number | null
          symbol: string
          trend: string
          trend_days: number | null
          wave: string
          wave_days: number | null
        }
        Insert: {
          candle_color?: string
          cloud_color?: string
          cloud_days?: number | null
          created_at?: string | null
          date: string
          ice_deluxe?: string | null
          id?: number
          metadata?: Json | null
          setter?: string
          setter_days?: number | null
          status?: string
          status_days?: number | null
          symbol: string
          trend?: string
          trend_days?: number | null
          wave?: string
          wave_days?: number | null
        }
        Update: {
          candle_color?: string
          cloud_color?: string
          cloud_days?: number | null
          created_at?: string | null
          date?: string
          ice_deluxe?: string | null
          id?: number
          metadata?: Json | null
          setter?: string
          setter_days?: number | null
          status?: string
          status_days?: number | null
          symbol?: string
          trend?: string
          trend_days?: number | null
          wave?: string
          wave_days?: number | null
        }
        Relationships: []
      }
      market_calendar: {
        Row: {
          date: string
          early_close: boolean | null
          holiday_name: string | null
          id: number
          is_trading_day: boolean
          market: string | null
          notes: string | null
        }
        Insert: {
          date: string
          early_close?: boolean | null
          holiday_name?: string | null
          id?: number
          is_trading_day?: boolean
          market?: string | null
          notes?: string | null
        }
        Update: {
          date?: string
          early_close?: boolean | null
          holiday_name?: string | null
          id?: number
          is_trading_day?: boolean
          market?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      premium_signals: {
        Row: {
          candle_date: string | null
          created_at: string | null
          direction: string
          entry_price: number | null
          expires_at_swing: boolean | null
          id: number
          is_active: boolean | null
          is_premium: boolean | null
          metadata: Json | null
          signal_date: string
          signal_strength: number | null
          signal_type: string
          stop_loss: number | null
          symbol: string
          target_price: number | null
          wave_context: string | null
        }
        Insert: {
          candle_date?: string | null
          created_at?: string | null
          direction: string
          entry_price?: number | null
          expires_at_swing?: boolean | null
          id?: number
          is_active?: boolean | null
          is_premium?: boolean | null
          metadata?: Json | null
          signal_date: string
          signal_strength?: number | null
          signal_type: string
          stop_loss?: number | null
          symbol: string
          target_price?: number | null
          wave_context?: string | null
        }
        Update: {
          candle_date?: string | null
          created_at?: string | null
          direction?: string
          entry_price?: number | null
          expires_at_swing?: boolean | null
          id?: number
          is_active?: boolean | null
          is_premium?: boolean | null
          metadata?: Json | null
          signal_date?: string
          signal_strength?: number | null
          signal_type?: string
          stop_loss?: number | null
          symbol?: string
          target_price?: number | null
          wave_context?: string | null
        }
        Relationships: []
      }
      signal_analysis_log: {
        Row: {
          created_at: string | null
          direction: string | null
          elliott_score: number | null
          error_message: string | null
          execution_time_ms: number | null
          final_score: number | null
          grade: string | null
          id: number
          indicators_calculated: number | null
          price_records: number | null
          status: string
          symbol: string
          technical_score: number | null
          workflow_run_id: number | null
        }
        Insert: {
          created_at?: string | null
          direction?: string | null
          elliott_score?: number | null
          error_message?: string | null
          execution_time_ms?: number | null
          final_score?: number | null
          grade?: string | null
          id?: number
          indicators_calculated?: number | null
          price_records?: number | null
          status: string
          symbol: string
          technical_score?: number | null
          workflow_run_id?: number | null
        }
        Update: {
          created_at?: string | null
          direction?: string | null
          elliott_score?: number | null
          error_message?: string | null
          execution_time_ms?: number | null
          final_score?: number | null
          grade?: string | null
          id?: number
          indicators_calculated?: number | null
          price_records?: number | null
          status?: string
          symbol?: string
          technical_score?: number | null
          workflow_run_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "signal_analysis_log_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_performance_tracking: {
        Row: {
          created_at: string | null
          direction: string
          entry_date: string | null
          entry_price: number | null
          exit_date: string | null
          exit_price: number | null
          exit_reason: string | null
          holding_days: number | null
          id: number
          lochstreifen_snapshot: Json | null
          market_regime: string | null
          pnl_amount: number | null
          pnl_percent: number | null
          pnl_r: number | null
          position_id: number | null
          setup_name: string | null
          signal_type: string
          strand_confidences: Json | null
          symbol: string
          trade_style: string | null
          was_profitable: boolean | null
        }
        Insert: {
          created_at?: string | null
          direction: string
          entry_date?: string | null
          entry_price?: number | null
          exit_date?: string | null
          exit_price?: number | null
          exit_reason?: string | null
          holding_days?: number | null
          id?: number
          lochstreifen_snapshot?: Json | null
          market_regime?: string | null
          pnl_amount?: number | null
          pnl_percent?: number | null
          pnl_r?: number | null
          position_id?: number | null
          setup_name?: string | null
          signal_type: string
          strand_confidences?: Json | null
          symbol: string
          trade_style?: string | null
          was_profitable?: boolean | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          entry_date?: string | null
          entry_price?: number | null
          exit_date?: string | null
          exit_price?: number | null
          exit_reason?: string | null
          holding_days?: number | null
          id?: number
          lochstreifen_snapshot?: Json | null
          market_regime?: string | null
          pnl_amount?: number | null
          pnl_percent?: number | null
          pnl_r?: number | null
          position_id?: number | null
          setup_name?: string | null
          signal_type?: string
          strand_confidences?: Json | null
          symbol?: string
          trade_style?: string | null
          was_profitable?: boolean | null
        }
        Relationships: []
      }
      stock_prices: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_1999: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2000: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2001: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2002: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2003: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2004: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2005: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2006: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2007: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2008: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2009: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2010: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2011: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2012: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2013: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2014: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2015: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2016: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2017: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2018: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2019: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2020: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2021: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2022: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2023: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2024: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2025: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      stock_prices_2026: {
        Row: {
          close: number
          created_at: string | null
          data_source: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          data_source?: string | null
          date: string
          high: number
          low: number
          open: number
          symbol: string
          updated_at?: string | null
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      strategy_analysis_cache: {
        Row: {
          analysis_date: string
          created_at: string | null
          data_quality_status: string | null
          ichimoku_long: number | null
          ichimoku_short: number | null
          id: number
          market_regime: string | null
          mean_reversion_long: number | null
          mean_reversion_short: number | null
          multi_indicator_long: number | null
          multi_indicator_short: number | null
          symbol: string
          technical_score_long: number | null
          technical_score_short: number | null
          trend_momentum_long: number | null
          trend_momentum_short: number | null
          volume_vwap_long: number | null
          volume_vwap_short: number | null
        }
        Insert: {
          analysis_date: string
          created_at?: string | null
          data_quality_status?: string | null
          ichimoku_long?: number | null
          ichimoku_short?: number | null
          id?: number
          market_regime?: string | null
          mean_reversion_long?: number | null
          mean_reversion_short?: number | null
          multi_indicator_long?: number | null
          multi_indicator_short?: number | null
          symbol: string
          technical_score_long?: number | null
          technical_score_short?: number | null
          trend_momentum_long?: number | null
          trend_momentum_short?: number | null
          volume_vwap_long?: number | null
          volume_vwap_short?: number | null
        }
        Update: {
          analysis_date?: string
          created_at?: string | null
          data_quality_status?: string | null
          ichimoku_long?: number | null
          ichimoku_short?: number | null
          id?: number
          market_regime?: string | null
          mean_reversion_long?: number | null
          mean_reversion_short?: number | null
          multi_indicator_long?: number | null
          multi_indicator_short?: number | null
          symbol?: string
          technical_score_long?: number | null
          technical_score_short?: number | null
          trend_momentum_long?: number | null
          trend_momentum_short?: number | null
          volume_vwap_long?: number | null
          volume_vwap_short?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_analysis_cache_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "symbols_master"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "strategy_analysis_cache_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "v_active_symbols"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "strategy_analysis_cache_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "v_dashboard_cards"
            referencedColumns: ["symbol"]
          },
        ]
      }
      strategy_config: {
        Row: {
          auto_tunable: boolean | null
          config_key: string
          config_value: Json
          created_at: string | null
          description: string | null
          id: number
          last_tuned_at: string | null
          last_tuned_reason: string | null
          max_value: number | null
          min_value: number | null
        }
        Insert: {
          auto_tunable?: boolean | null
          config_key: string
          config_value: Json
          created_at?: string | null
          description?: string | null
          id?: number
          last_tuned_at?: string | null
          last_tuned_reason?: string | null
          max_value?: number | null
          min_value?: number | null
        }
        Update: {
          auto_tunable?: boolean | null
          config_key?: string
          config_value?: Json
          created_at?: string | null
          description?: string | null
          id?: number
          last_tuned_at?: string | null
          last_tuned_reason?: string | null
          max_value?: number | null
          min_value?: number | null
        }
        Relationships: []
      }
      strategy_performance_log: {
        Row: {
          adjustments_made: Json | null
          avg_holding_days: number | null
          avg_loss_percent: number | null
          avg_win_percent: number | null
          created_at: string | null
          expectancy: number | null
          id: number
          log_date: string
          losing_trades: number | null
          period_days: number
          profit_factor: number | null
          sharpe_ratio: number | null
          strand_accuracy: Json | null
          total_trades: number | null
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          adjustments_made?: Json | null
          avg_holding_days?: number | null
          avg_loss_percent?: number | null
          avg_win_percent?: number | null
          created_at?: string | null
          expectancy?: number | null
          id?: number
          log_date: string
          losing_trades?: number | null
          period_days: number
          profit_factor?: number | null
          sharpe_ratio?: number | null
          strand_accuracy?: Json | null
          total_trades?: number | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Update: {
          adjustments_made?: Json | null
          avg_holding_days?: number | null
          avg_loss_percent?: number | null
          avg_win_percent?: number | null
          created_at?: string | null
          expectancy?: number | null
          id?: number
          log_date?: string
          losing_trades?: number | null
          period_days?: number
          profit_factor?: number | null
          sharpe_ratio?: number | null
          strand_accuracy?: Json | null
          total_trades?: number | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Relationships: []
      }
      symbols_master: {
        Row: {
          active: boolean | null
          created_at: string | null
          data_start_date: string | null
          exchange: string | null
          id: number
          name: string
          notes: string | null
          priority: number | null
          symbol: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          data_start_date?: string | null
          exchange?: string | null
          id?: number
          name: string
          notes?: string | null
          priority?: number | null
          symbol: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          data_start_date?: string | null
          exchange?: string | null
          id?: number
          name?: string
          notes?: string | null
          priority?: number | null
          symbol?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      technical_indicators: {
        Row: {
          calculation_method: string | null
          created_at: string | null
          date: string
          id: number
          indicator_category: string | null
          indicator_name: string
          signal_strength: number | null
          symbol: string
          updated_at: string | null
          value_1: number | null
          value_2: number | null
          value_3: number | null
          value_4: number | null
          value_5: number | null
        }
        Insert: {
          calculation_method?: string | null
          created_at?: string | null
          date: string
          id?: number
          indicator_category?: string | null
          indicator_name: string
          signal_strength?: number | null
          symbol: string
          updated_at?: string | null
          value_1?: number | null
          value_2?: number | null
          value_3?: number | null
          value_4?: number | null
          value_5?: number | null
        }
        Update: {
          calculation_method?: string | null
          created_at?: string | null
          date?: string
          id?: number
          indicator_category?: string | null
          indicator_name?: string
          signal_strength?: number | null
          symbol?: string
          updated_at?: string | null
          value_1?: number | null
          value_2?: number | null
          value_3?: number | null
          value_4?: number | null
          value_5?: number | null
        }
        Relationships: []
      }
      trading_decisions: {
        Row: {
          action_type: string
          confidence_score: number | null
          created_at: string | null
          croc_status: string | null
          decision_id: number
          decision_timestamp: string
          entry_price: number | null
          has_open_position: boolean | null
          ice_signals_active: string | null
          reasoning: string | null
          stop_loss: number | null
          strand1_confidence: number | null
          strand1_long_score: number | null
          strand1_short_score: number | null
          strand1_signal: string | null
          strand2_confidence: number | null
          strand2_direction_bias: string | null
          strand2_signal: string | null
          strand2_wave_pattern: string | null
          strand3_confidence: number | null
          strand3_long_score: number | null
          strand3_short_score: number | null
          strand3_signal: string | null
          strand4_confidence: number | null
          strand4_long_score: number | null
          strand4_short_score: number | null
          strand4_signal: string | null
          symbol: string
          take_profit_1: number | null
          take_profit_2: number | null
          take_profit_3: number | null
          trailing_stop_percent: number | null
        }
        Insert: {
          action_type: string
          confidence_score?: number | null
          created_at?: string | null
          croc_status?: string | null
          decision_id?: number
          decision_timestamp: string
          entry_price?: number | null
          has_open_position?: boolean | null
          ice_signals_active?: string | null
          reasoning?: string | null
          stop_loss?: number | null
          strand1_confidence?: number | null
          strand1_long_score?: number | null
          strand1_short_score?: number | null
          strand1_signal?: string | null
          strand2_confidence?: number | null
          strand2_direction_bias?: string | null
          strand2_signal?: string | null
          strand2_wave_pattern?: string | null
          strand3_confidence?: number | null
          strand3_long_score?: number | null
          strand3_short_score?: number | null
          strand3_signal?: string | null
          strand4_confidence?: number | null
          strand4_long_score?: number | null
          strand4_short_score?: number | null
          strand4_signal?: string | null
          symbol: string
          take_profit_1?: number | null
          take_profit_2?: number | null
          take_profit_3?: number | null
          trailing_stop_percent?: number | null
        }
        Update: {
          action_type?: string
          confidence_score?: number | null
          created_at?: string | null
          croc_status?: string | null
          decision_id?: number
          decision_timestamp?: string
          entry_price?: number | null
          has_open_position?: boolean | null
          ice_signals_active?: string | null
          reasoning?: string | null
          stop_loss?: number | null
          strand1_confidence?: number | null
          strand1_long_score?: number | null
          strand1_short_score?: number | null
          strand1_signal?: string | null
          strand2_confidence?: number | null
          strand2_direction_bias?: string | null
          strand2_signal?: string | null
          strand2_wave_pattern?: string | null
          strand3_confidence?: number | null
          strand3_long_score?: number | null
          strand3_short_score?: number | null
          strand3_signal?: string | null
          strand4_confidence?: number | null
          strand4_long_score?: number | null
          strand4_short_score?: number | null
          strand4_signal?: string | null
          symbol?: string
          take_profit_1?: number | null
          take_profit_2?: number | null
          take_profit_3?: number | null
          trailing_stop_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_decisions_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "symbols_master"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "trading_decisions_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "v_active_symbols"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "trading_decisions_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "v_dashboard_cards"
            referencedColumns: ["symbol"]
          },
        ]
      }
      trading_positions: {
        Row: {
          closed_at: string | null
          created_at: string | null
          current_price: number | null
          entry_price: number
          exit_price: number | null
          holding_days: number | null
          id: number
          opened_at: string | null
          pnl_amount: number | null
          pnl_percent: number | null
          position_status: string
          position_type: string
          signal_id: number | null
          stop_loss: number
          symbol: string
          take_profit_1: number | null
          take_profit_2: number | null
          take_profit_3: number | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          current_price?: number | null
          entry_price: number
          exit_price?: number | null
          holding_days?: number | null
          id?: number
          opened_at?: string | null
          pnl_amount?: number | null
          pnl_percent?: number | null
          position_status?: string
          position_type: string
          signal_id?: number | null
          stop_loss: number
          symbol: string
          take_profit_1?: number | null
          take_profit_2?: number | null
          take_profit_3?: number | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          current_price?: number | null
          entry_price?: number
          exit_price?: number | null
          holding_days?: number | null
          id?: number
          opened_at?: string | null
          pnl_amount?: number | null
          pnl_percent?: number | null
          position_status?: string
          position_type?: string
          signal_id?: number | null
          stop_loss?: number
          symbol?: string
          take_profit_1?: number | null
          take_profit_2?: number | null
          take_profit_3?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_positions_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "trading_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_positions_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "symbols_master"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "trading_positions_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "v_active_symbols"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "trading_positions_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "v_dashboard_cards"
            referencedColumns: ["symbol"]
          },
        ]
      }
      trading_rules: {
        Row: {
          account_id: number
          created_at: string
          id: number
          is_active: boolean
          rule_name: string
          rule_type: string
          rule_value: Json
          updated_at: string
        }
        Insert: {
          account_id: number
          created_at?: string
          id?: number
          is_active?: boolean
          rule_name: string
          rule_type: string
          rule_value?: Json
          updated_at?: string
        }
        Update: {
          account_id?: number
          created_at?: string
          id?: number
          is_active?: boolean
          rule_name?: string
          rule_type?: string
          rule_value?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "demo_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_signals: {
        Row: {
          actual_exit_price: number | null
          actual_pnl_percent: number | null
          ai_analysis: string | null
          ai_model: string | null
          closed_at: string | null
          confidence_level: number | null
          created_at: string | null
          direction: string
          elliott_score: number | null
          elliott_wave_pattern: string | null
          entry_price: number
          execution_status: string | null
          final_score: number
          grade: string
          ichimoku_score: number | null
          id: number
          market_regime: string | null
          mean_reversion_score: number | null
          multi_indicator_score: number | null
          outcome: string | null
          risk_reward_ratio: number | null
          signal_date: string
          stop_loss: number
          symbol: string
          target_1: number
          target_2: number
          target_3: number | null
          technical_score: number | null
          trend_momentum_score: number | null
          volume_vwap_score: number | null
        }
        Insert: {
          actual_exit_price?: number | null
          actual_pnl_percent?: number | null
          ai_analysis?: string | null
          ai_model?: string | null
          closed_at?: string | null
          confidence_level?: number | null
          created_at?: string | null
          direction: string
          elliott_score?: number | null
          elliott_wave_pattern?: string | null
          entry_price: number
          execution_status?: string | null
          final_score: number
          grade: string
          ichimoku_score?: number | null
          id?: number
          market_regime?: string | null
          mean_reversion_score?: number | null
          multi_indicator_score?: number | null
          outcome?: string | null
          risk_reward_ratio?: number | null
          signal_date: string
          stop_loss: number
          symbol: string
          target_1: number
          target_2: number
          target_3?: number | null
          technical_score?: number | null
          trend_momentum_score?: number | null
          volume_vwap_score?: number | null
        }
        Update: {
          actual_exit_price?: number | null
          actual_pnl_percent?: number | null
          ai_analysis?: string | null
          ai_model?: string | null
          closed_at?: string | null
          confidence_level?: number | null
          created_at?: string | null
          direction?: string
          elliott_score?: number | null
          elliott_wave_pattern?: string | null
          entry_price?: number
          execution_status?: string | null
          final_score?: number
          grade?: string
          ichimoku_score?: number | null
          id?: number
          market_regime?: string | null
          mean_reversion_score?: number | null
          multi_indicator_score?: number | null
          outcome?: string | null
          risk_reward_ratio?: number | null
          signal_date?: string
          stop_loss?: number
          symbol?: string
          target_1?: number
          target_2?: number
          target_3?: number | null
          technical_score?: number | null
          trend_momentum_score?: number | null
          volume_vwap_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_signals_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "symbols_master"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "trading_signals_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "v_active_symbols"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "trading_signals_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "v_dashboard_cards"
            referencedColumns: ["symbol"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          errors: Json | null
          id: number
          metadata: Json | null
          started_at: string | null
          status: string
          symbols_failed: number | null
          symbols_processed: number | null
          symbols_succeeded: number | null
          trigger_source: string | null
          workflow_id: string | null
          workflow_name: string
        }
        Insert: {
          completed_at?: string | null
          errors?: Json | null
          id?: number
          metadata?: Json | null
          started_at?: string | null
          status?: string
          symbols_failed?: number | null
          symbols_processed?: number | null
          symbols_succeeded?: number | null
          trigger_source?: string | null
          workflow_id?: string | null
          workflow_name: string
        }
        Update: {
          completed_at?: string | null
          errors?: Json | null
          id?: number
          metadata?: Json | null
          started_at?: string | null
          status?: string
          symbols_failed?: number | null
          symbols_processed?: number | null
          symbols_succeeded?: number | null
          trigger_source?: string | null
          workflow_id?: string | null
          workflow_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_active_symbols: {
        Row: {
          company_name: string | null
          exchange: string | null
          indicator_count: number | null
          last_price_date: string | null
          symbol: string | null
          total_prices: number | null
          type: string | null
        }
        Insert: {
          company_name?: string | null
          exchange?: string | null
          indicator_count?: never
          last_price_date?: never
          symbol?: string | null
          total_prices?: never
          type?: string | null
        }
        Update: {
          company_name?: string | null
          exchange?: string | null
          indicator_count?: never
          last_price_date?: never
          symbol?: string | null
          total_prices?: never
          type?: string | null
        }
        Relationships: []
      }
      v_dashboard_cards: {
        Row: {
          action_type: string | null
          active: boolean | null
          asset_type: string | null
          bear_signals: number | null
          bull_signals: number | null
          company_name: string | null
          confidence_score: number | null
          croc_status_value: number | null
          current_price: number | null
          decision_croc_status: string | null
          decision_ice_signals: string | null
          decision_id: number | null
          decision_timestamp: string | null
          exchange: string | null
          grade: string | null
          high_price: number | null
          live_ice_signals: number | null
          low_price: number | null
          open_price: number | null
          prev_close: number | null
          price_change_abs: number | null
          price_change_pct: number | null
          price_date: string | null
          reasoning: string | null
          strand1_confidence: number | null
          strand1_long_score: number | null
          strand1_short_score: number | null
          strand1_signal: string | null
          strand2_confidence: number | null
          strand2_direction_bias: string | null
          strand2_signal: string | null
          strand2_wave_pattern: string | null
          strand3_confidence: number | null
          strand3_long_score: number | null
          strand3_short_score: number | null
          strand3_signal: string | null
          strand4_confidence: number | null
          strand4_long_score: number | null
          strand4_short_score: number | null
          strand4_signal: string | null
          suggested_entry: number | null
          suggested_stop: number | null
          suggested_tp1: number | null
          suggested_tp2: number | null
          suggested_tp3: number | null
          symbol: string | null
          volume: number | null
        }
        Relationships: []
      }
      v_indicator_coverage: {
        Row: {
          data_points: number | null
          first_date: string | null
          indicator_category: string | null
          indicator_name: string | null
          last_date: string | null
          symbol: string | null
        }
        Relationships: []
      }
      v_latest_prices: {
        Row: {
          close: number | null
          company_name: string | null
          date: string | null
          high: number | null
          low: number | null
          open: number | null
          symbol: string | null
          volume: number | null
        }
        Relationships: []
      }
      v_stock_prices_all: {
        Row: {
          close: number | null
          created_at: string | null
          data_source: string | null
          date: string | null
          high: number | null
          low: number | null
          open: number | null
          symbol: string | null
          updated_at: string | null
          volume: number | null
        }
        Insert: {
          close?: number | null
          created_at?: string | null
          data_source?: string | null
          date?: string | null
          high?: number | null
          low?: number | null
          open?: number | null
          symbol?: string | null
          updated_at?: string | null
          volume?: number | null
        }
        Update: {
          close?: number | null
          created_at?: string | null
          data_source?: string | null
          date?: string | null
          high?: number | null
          low?: number | null
          open?: number | null
          symbol?: string | null
          updated_at?: string | null
          volume?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      advance_pipeline: { Args: never; Returns: Json }
      batch_calculate_all_symbols: {
        Args: never
        Returns: {
          categories_done: number
          status: string
          symbol_processed: string
        }[]
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      calculate_advanced_indicators: {
        Args: { p_symbol: string }
        Returns: {
          indicators_calculated: number
          latest_date: string
        }[]
      }
      calculate_all_indicators: {
        Args: { p_symbol: string }
        Returns: {
          category: string
          indicators_calculated: number
          latest_date: string
        }[]
      }
      calculate_all_indicators_long: {
        Args: { p_symbol: string }
        Returns: {
          category: string
          indicators_calculated: number
          latest_date: string
        }[]
      }
      calculate_croc_ice_score: {
        Args: { p_date: string; p_direction: string; p_symbol: string }
        Returns: number
      }
      calculate_croc_indicators: {
        Args: { p_symbol: string }
        Returns: {
          indicators_calculated: number
          latest_date: string
        }[]
      }
      calculate_ichimoku_indicators: {
        Args: { p_symbol: string }
        Returns: {
          indicators_calculated: number
          latest_date: string
        }[]
      }
      calculate_ichimoku_score: {
        Args: { p_date: string; p_direction: string; p_symbol: string }
        Returns: number
      }
      calculate_lochstreifen: {
        Args: { p_date?: string; p_symbol: string }
        Returns: Json
      }
      calculate_mean_reversion_score: {
        Args: { p_date: string; p_direction: string; p_symbol: string }
        Returns: number
      }
      calculate_momentum_indicators: {
        Args: { p_symbol: string }
        Returns: {
          indicators_calculated: number
          latest_date: string
        }[]
      }
      calculate_multi_indicator_score: {
        Args: { p_date: string; p_direction: string; p_symbol: string }
        Returns: number
      }
      calculate_next_missing_symbol: { Args: never; Returns: string }
      calculate_oscillator_indicators: {
        Args: { p_symbol: string }
        Returns: {
          indicators_calculated: number
          latest_date: string
        }[]
      }
      calculate_portfolio_performance: {
        Args: { p_account_id?: number }
        Returns: Json
      }
      calculate_sar_indicator: {
        Args: { p_symbol: string }
        Returns: {
          indicators_calculated: number
          latest_date: string
        }[]
      }
      calculate_trend_indicators: {
        Args: { p_symbol: string }
        Returns: {
          indicators_calculated: number
          latest_date: string
        }[]
      }
      calculate_trend_momentum_score: {
        Args: { p_date: string; p_direction: string; p_symbol: string }
        Returns: number
      }
      calculate_volatility_indicators: {
        Args: { p_symbol: string }
        Returns: {
          indicators_calculated: number
          latest_date: string
        }[]
      }
      calculate_volume_indicators: {
        Args: { p_symbol: string }
        Returns: {
          indicators_calculated: number
          latest_date: string
        }[]
      }
      calculate_volume_vwap_score: {
        Args: { p_date: string; p_direction: string; p_symbol: string }
        Returns: number
      }
      check_api_rate_limit: {
        Args: never
        Returns: {
          calls_remaining: number
          calls_today: number
          can_proceed: boolean
          last_call: string
          max_calls: number
        }[]
      }
      check_trading_rules: {
        Args: {
          p_account_id: number
          p_direction: string
          p_entry_price: number
          p_quantity: number
          p_stop_loss?: number
          p_symbol: string
        }
        Returns: Json
      }
      close_demo_position: {
        Args: {
          p_close_reason?: string
          p_exit_price: number
          p_position_id: number
        }
        Returns: Json
      }
      complete_workflow_run: {
        Args: {
          p_metadata?: Json
          p_run_id: number
          p_status?: string
          p_symbols_failed?: number
          p_symbols_processed?: number
          p_symbols_succeeded?: number
        }
        Returns: undefined
      }
      detect_ice_signals: {
        Args: { p_date: string; p_symbol: string }
        Returns: {
          out_direction: string
          out_signal_type: string
          out_stop: number
          out_strength: number
          out_trigger: number
        }[]
      }
      detect_ice_signals_v2: {
        Args: { p_date: string; p_symbol: string }
        Returns: {
          out_direction: string
          out_dna_line: number
          out_entry_type: string
          out_signal_type: string
          out_stop: number
          out_strength: number
          out_trigger: number
        }[]
      }
      detect_market_regime: {
        Args: { p_date: string; p_symbol: string }
        Returns: string
      }
      detect_premium_signals: {
        Args: { p_date: string; p_symbol: string }
        Returns: {
          out_direction: string
          out_is_premium: boolean
          out_signal_type: string
          out_strength: number
        }[]
      }
      detect_trading_setups: {
        Args: { p_date: string; p_symbol: string }
        Returns: {
          out_confidence: number
          out_direction: string
          out_entry: number
          out_entry_type: string
          out_setup: string
          out_stop: number
        }[]
      }
      evaluate_strategy_performance: { Args: never; Returns: Json }
      execute_demo_trade: {
        Args: {
          p_account_id: number
          p_decision_id?: number
          p_direction: string
          p_entry_price: number
          p_notes?: string
          p_quantity: number
          p_skip_rules?: boolean
          p_stop_loss?: number
          p_symbol: string
          p_tp1?: number
          p_tp2?: number
          p_tp3?: number
          p_trigger_source?: string
        }
        Returns: Json
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      init_daily_pipeline: { Args: { p_date?: string }; Returns: Json }
      is_trading_day: { Args: { p_date?: string }; Returns: boolean }
      log_api_call: {
        Args: {
          p_api_name?: string
          p_endpoint?: string
          p_error?: string
          p_http_status?: number
          p_success?: boolean
          p_symbol?: string
        }
        Returns: undefined
      }
      recalculate_all_s4_scores: {
        Args: never
        Returns: {
          new_confidence: number
          new_long_score: number
          new_short_score: number
          updated_date: string
          updated_symbol: string
        }[]
      }
      run_historical_backtest: {
        Args: {
          p_account_id?: number
          p_end_date?: string
          p_initial_balance?: number
          p_max_positions?: number
          p_min_confidence?: number
          p_partial_close_at_1r?: boolean
          p_risk_per_trade?: number
          p_start_date?: string
          p_trailing_pct?: number
        }
        Returns: Json
      }
      snapshot_daily_balance: { Args: never; Returns: Json }
      start_workflow_run: {
        Args: {
          p_trigger_source?: string
          p_workflow_id?: string
          p_workflow_name: string
        }
        Returns: number
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      update_demo_positions_prices: { Args: never; Returns: Json }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      validate_symbol_data_quality: {
        Args: { p_symbol: string }
        Returns: {
          check_name: string
          details: string
          status: string
        }[]
      }
      verify_analysis_complete: { Args: { p_date: string }; Returns: Json }
      verify_indicators_complete: { Args: { p_date: string }; Returns: Json }
      verify_prices_loaded: { Args: { p_date: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
