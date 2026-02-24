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
      croc_ice_signals: {
        Row: {
          created_at: string | null
          direction: string
          expiry_date: string | null
          filter_status: Json | null
          id: number
          is_active: boolean | null
          is_triggered: boolean | null
          metadata: Json | null
          signal_date: string
          signal_strength: number | null
          signal_type: string
          stop_price: number | null
          symbol: string
          trigger_price: number | null
        }
        Insert: {
          created_at?: string | null
          direction: string
          expiry_date?: string | null
          filter_status?: Json | null
          id?: never
          is_active?: boolean | null
          is_triggered?: boolean | null
          metadata?: Json | null
          signal_date: string
          signal_strength?: number | null
          signal_type: string
          stop_price?: number | null
          symbol: string
          trigger_price?: number | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          expiry_date?: string | null
          filter_status?: Json | null
          id?: never
          is_active?: boolean | null
          is_triggered?: boolean | null
          metadata?: Json | null
          signal_date?: string
          signal_strength?: number | null
          signal_type?: string
          stop_price?: number | null
          symbol?: string
          trigger_price?: number | null
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
        ]
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
        ]
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
      bytea_to_text: { Args: { data: string }; Returns: string }
      calculate_all_indicators: {
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
      calculate_ichimoku_score: {
        Args: { p_date: string; p_direction: string; p_symbol: string }
        Returns: number
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
      calculate_oscillator_indicators: {
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
      start_workflow_run: {
        Args: {
          p_trigger_source?: string
          p_workflow_id?: string
          p_workflow_name: string
        }
        Returns: number
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
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
