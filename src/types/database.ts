export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            admin_users: {
                Row: {
                    created_at: string | null
                    full_name: string
                    id: string
                    organization_id: string
                    role: Database["public"]["Enums"]["user_role"]
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    full_name: string
                    id: string
                    organization_id: string
                    role?: Database["public"]["Enums"]["user_role"]
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    full_name?: string
                    id?: string
                    organization_id?: string
                    role?: Database["public"]["Enums"]["user_role"]
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "admin_users_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            appointments: {
                Row: {
                    cancellation_reason: string | null
                    created_at: string | null
                    end_time: string
                    id: string
                    notes: string | null
                    organization_id: string
                    patient_id: string | null
                    service_id: string | null
                    start_time: string
                    status: Database["public"]["Enums"]["appointment_status"] | null
                    updated_at: string | null
                }
                Insert: {
                    cancellation_reason?: string | null
                    created_at?: string | null
                    end_time: string
                    id?: string
                    notes?: string | null
                    organization_id: string
                    patient_id?: string | null
                    service_id?: string | null
                    start_time: string
                    status?: Database["public"]["Enums"]["appointment_status"] | null
                    updated_at?: string | null
                }
                Update: {
                    cancellation_reason?: string | null
                    created_at?: string | null
                    end_time?: string
                    id?: string
                    notes?: string | null
                    organization_id?: string
                    patient_id?: string | null
                    service_id?: string | null
                    start_time?: string
                    status?: Database["public"]["Enums"]["appointment_status"] | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "appointments_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "appointments_patient_id_fkey"
                        columns: ["patient_id"]
                        isOneToOne: false
                        referencedRelation: "patients"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "appointments_service_id_fkey"
                        columns: ["service_id"]
                        isOneToOne: false
                        referencedRelation: "services"
                        referencedColumns: ["id"]
                    },
                ]
            }
            campaign_sends: {
                Row: {
                    campaign_id: string
                    created_at: string | null
                    delivered_at: string | null
                    error_message: string | null
                    id: string
                    lead_id: string | null
                    organization_id: string
                    patient_id: string | null
                    sent_at: string | null
                    status: string
                }
                Insert: {
                    campaign_id: string
                    created_at?: string | null
                    delivered_at?: string | null
                    error_message?: string | null
                    id?: string
                    lead_id?: string | null
                    organization_id: string
                    patient_id?: string | null
                    sent_at?: string | null
                    status?: string
                }
                Update: {
                    campaign_id?: string
                    created_at?: string | null
                    delivered_at?: string | null
                    error_message?: string | null
                    id?: string
                    lead_id?: string | null
                    organization_id?: string
                    patient_id?: string | null
                    sent_at?: string | null
                    status?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "campaign_sends_campaign_id_fkey"
                        columns: ["campaign_id"]
                        isOneToOne: false
                        referencedRelation: "drip_campaigns"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "campaign_sends_lead_id_fkey"
                        columns: ["lead_id"]
                        isOneToOne: false
                        referencedRelation: "leads"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "campaign_sends_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "campaign_sends_patient_id_fkey"
                        columns: ["patient_id"]
                        isOneToOne: false
                        referencedRelation: "patients"
                        referencedColumns: ["id"]
                    },
                ]
            }
            conversation_summaries: {
                Row: {
                    created_at: string | null
                    id: string
                    key_facts: Json | null
                    lead_id: string | null
                    message_range_end: string | null
                    message_range_start: string | null
                    organization_id: string
                    patient_id: string | null
                    summary: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    key_facts?: Json | null
                    lead_id?: string | null
                    message_range_end?: string | null
                    message_range_start?: string | null
                    organization_id: string
                    patient_id?: string | null
                    summary: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    key_facts?: Json | null
                    lead_id?: string | null
                    message_range_end?: string | null
                    message_range_start?: string | null
                    organization_id?: string
                    patient_id?: string | null
                    summary?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "conversation_summaries_lead_id_fkey"
                        columns: ["lead_id"]
                        isOneToOne: false
                        referencedRelation: "leads"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "conversation_summaries_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "conversation_summaries_patient_id_fkey"
                        columns: ["patient_id"]
                        isOneToOne: false
                        referencedRelation: "patients"
                        referencedColumns: ["id"]
                    },
                ]
            }
            drip_campaigns: {
                Row: {
                    created_at: string | null
                    id: string
                    is_active: boolean | null
                    message_template: string
                    name: string
                    organization_id: string
                    send_count: number | null
                    trigger_condition: Json
                    type: Database["public"]["Enums"]["campaign_type"]
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    message_template: string
                    name: string
                    organization_id: string
                    send_count?: number | null
                    trigger_condition?: Json
                    type: Database["public"]["Enums"]["campaign_type"]
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    message_template?: string
                    name?: string
                    organization_id?: string
                    send_count?: number | null
                    trigger_condition?: Json
                    type?: Database["public"]["Enums"]["campaign_type"]
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "drip_campaigns_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            inventory_items: {
                Row: {
                    created_at: string | null
                    id: string
                    min_stock_level: number | null
                    name: string
                    organization_id: string
                    quantity: number
                    sku: string | null
                    unit: string | null
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    min_stock_level?: number | null
                    name: string
                    organization_id: string
                    quantity?: number
                    sku?: string | null
                    unit?: string | null
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    min_stock_level?: number | null
                    name?: string
                    organization_id?: string
                    quantity?: number
                    sku?: string | null
                    unit?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "inventory_items_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            knowledge_docs: {
                Row: {
                    content: string
                    created_at: string | null
                    embedding: string | null
                    id: string
                    metadata: Json | null
                    organization_id: string
                }
                Insert: {
                    content: string
                    created_at?: string | null
                    embedding?: string | null
                    id?: string
                    metadata?: Json | null
                    organization_id: string
                }
                Update: {
                    content?: string
                    created_at?: string | null
                    embedding?: string | null
                    id?: string
                    metadata?: Json | null
                    organization_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "knowledge_docs_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            leads: {
                Row: {
                    ai_tags: string[] | null
                    created_at: string | null
                    id: string
                    last_contact_at: string | null
                    name: string | null
                    organization_id: string
                    phone: string
                    source: Database["public"]["Enums"]["contact_source"] | null
                    status: string | null
                    updated_at: string | null
                }
                Insert: {
                    ai_tags?: string[] | null
                    created_at?: string | null
                    id?: string
                    last_contact_at?: string | null
                    name?: string | null
                    organization_id: string
                    phone: string
                    source?: Database["public"]["Enums"]["contact_source"] | null
                    status?: string | null
                    updated_at?: string | null
                }
                Update: {
                    ai_tags?: string[] | null
                    created_at?: string | null
                    id?: string
                    last_contact_at?: string | null
                    name?: string | null
                    organization_id?: string
                    phone?: string
                    source?: Database["public"]["Enums"]["contact_source"] | null
                    status?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "leads_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            messages: {
                Row: {
                    content: string
                    created_at: string | null
                    id: string
                    lead_id: string | null
                    organization_id: string
                    patient_id: string | null
                    role: string
                }
                Insert: {
                    content: string
                    created_at?: string | null
                    id?: string
                    lead_id?: string | null
                    organization_id: string
                    patient_id?: string | null
                    role: string
                }
                Update: {
                    content?: string
                    created_at?: string | null
                    id?: string
                    lead_id?: string | null
                    organization_id?: string
                    patient_id?: string | null
                    role?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "messages_lead_id_fkey"
                        columns: ["lead_id"]
                        isOneToOne: false
                        referencedRelation: "leads"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "messages_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "messages_patient_id_fkey"
                        columns: ["patient_id"]
                        isOneToOne: false
                        referencedRelation: "patients"
                        referencedColumns: ["id"]
                    },
                ]
            }
            organizations: {
                Row: {
                    created_at: string | null
                    id: string
                    name: string
                    settings: Json | null
                    slug: string
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    name: string
                    settings?: Json | null
                    slug: string
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    name?: string
                    settings?: Json | null
                    slug?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
            patient_documents: {
                Row: {
                    created_at: string | null
                    file_name: string
                    file_path: string
                    id: string
                    mime_type: string | null
                    organization_id: string
                    patient_id: string
                    size_bytes: number | null
                }
                Insert: {
                    created_at?: string | null
                    file_name: string
                    file_path: string
                    id?: string
                    mime_type?: string | null
                    organization_id: string
                    patient_id: string
                    size_bytes?: number | null
                }
                Update: {
                    created_at?: string | null
                    file_name?: string
                    file_path?: string
                    id?: string
                    mime_type?: string | null
                    organization_id?: string
                    patient_id?: string
                    size_bytes?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "patient_documents_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "patient_documents_patient_id_fkey"
                        columns: ["patient_id"]
                        isOneToOne: false
                        referencedRelation: "patients"
                        referencedColumns: ["id"]
                    },
                ]
            }
            patient_feedback: {
                Row: {
                    appointment_id: string | null
                    collected_via: string | null
                    created_at: string | null
                    feedback_text: string | null
                    id: string
                    nps_score: number | null
                    organization_id: string
                    patient_id: string
                }
                Insert: {
                    appointment_id?: string | null
                    collected_via?: string | null
                    created_at?: string | null
                    feedback_text?: string | null
                    id?: string
                    nps_score?: number | null
                    organization_id: string
                    patient_id: string
                }
                Update: {
                    appointment_id?: string | null
                    collected_via?: string | null
                    created_at?: string | null
                    feedback_text?: string | null
                    id?: string
                    nps_score?: number | null
                    organization_id?: string
                    patient_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "patient_feedback_appointment_id_fkey"
                        columns: ["appointment_id"]
                        isOneToOne: false
                        referencedRelation: "appointments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "patient_feedback_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "patient_feedback_patient_id_fkey"
                        columns: ["patient_id"]
                        isOneToOne: false
                        referencedRelation: "patients"
                        referencedColumns: ["id"]
                    },
                ]
            }
            patients: {
                Row: {
                    address: string | null
                    ai_notes: string | null
                    ai_tags: string[] | null
                    created_at: string | null
                    email: string | null
                    full_name: string
                    id: string
                    notes: string | null
                    organization_id: string
                    updated_at: string | null
                    whatsapp_number: string
                }
                Insert: {
                    address?: string | null
                    ai_notes?: string | null
                    ai_tags?: string[] | null
                    created_at?: string | null
                    email?: string | null
                    full_name: string
                    id?: string
                    notes?: string | null
                    organization_id: string
                    updated_at?: string | null
                    whatsapp_number: string
                }
                Update: {
                    address?: string | null
                    ai_notes?: string | null
                    ai_tags?: string[] | null
                    created_at?: string | null
                    email?: string | null
                    full_name?: string
                    id?: string
                    notes?: string | null
                    organization_id?: string
                    updated_at?: string | null
                    whatsapp_number?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "patients_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            rate_limits: {
                Row: {
                    count: number | null
                    key: string
                    last_request_at: string | null
                }
                Insert: {
                    count?: number | null
                    key: string
                    last_request_at?: string | null
                }
                Update: {
                    count?: number | null
                    key?: string
                    last_request_at?: string | null
                }
                Relationships: []
            }
            services: {
                Row: {
                    created_at: string | null
                    description: string | null
                    duration_minutes: number
                    id: string
                    is_active: boolean | null
                    organization_id: string
                    price: number
                    title: string
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    duration_minutes: number
                    id?: string
                    is_active?: boolean | null
                    organization_id: string
                    price: number
                    title: string
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    duration_minutes?: number
                    id?: string
                    is_active?: boolean | null
                    organization_id?: string
                    price?: number
                    title?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "services_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            transactions: {
                Row: {
                    amount: number
                    appointment_id: string | null
                    created_at: string | null
                    description: string | null
                    id: string
                    organization_id: string
                    patient_id: string | null
                    type: Database["public"]["Enums"]["transaction_type"]
                }
                Insert: {
                    amount: number
                    appointment_id?: string | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    organization_id: string
                    patient_id?: string | null
                    type: Database["public"]["Enums"]["transaction_type"]
                }
                Update: {
                    amount?: number
                    appointment_id?: string | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    organization_id?: string
                    patient_id?: string | null
                    type?: Database["public"]["Enums"]["transaction_type"]
                }
                Relationships: [
                    {
                        foreignKeyName: "transactions_appointment_id_fkey"
                        columns: ["appointment_id"]
                        isOneToOne: false
                        referencedRelation: "appointments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_patient_id_fkey"
                        columns: ["patient_id"]
                        isOneToOne: false
                        referencedRelation: "patients"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            get_auth_org_id: {
                Args: Record<PropertyKey, never>
                Returns: string
            }
        }
        Enums: {
            appointment_status:
            | "scheduled"
            | "confirmed"
            | "completed"
            | "cancelled"
            | "no_show"
            campaign_type: "reactivation" | "nps" | "reminder" | "promotion"
            contact_source: "whatsapp" | "website" | "referral" | "walk_in" | "other"
            transaction_type: "income" | "expense" | "payment" | "charge"
            user_role: "owner" | "admin" | "dentist" | "assistant"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Helper types for convenience
export type Tables<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Row"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
    Database["public"]["Enums"][T]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Update"]
