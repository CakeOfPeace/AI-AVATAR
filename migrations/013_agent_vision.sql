-- Migration: Add vision column to equos_agents table
ALTER TABLE equos_agents ADD COLUMN IF NOT EXISTS vision BOOLEAN DEFAULT false;
