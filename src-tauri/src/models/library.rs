use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum LibraryDocumentStatus {
    Ready,
    Stale,
    Missing,
    Invalid,
    Indexing,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum LibraryRefreshFailureReason {
    MissingFile,
    InvalidJson,
    UnsupportedVersion,
    PermissionDenied,
    IndexWriteFailed,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryPage<T> {
    pub items: Vec<T>,
    pub has_more: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum LibrarySortBy {
    UpdatedAt,
    Title,
    TaskCount,
    TagCount,
    Status,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum LibrarySortDirection {
    Asc,
    Desc,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryDocumentItem {
    pub document_id: String,
    pub title: String,
    pub path: String,
    pub updated_at: u64,
    pub indexed_at: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_mtime: Option<u64>,
    pub node_count: u32,
    pub task_count: u32,
    pub unchecked_task_count: u32,
    pub tags: Vec<String>,
    pub status: LibraryDocumentStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_summary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_refresh_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_refresh_duration_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_refresh_status: Option<LibraryDocumentStatus>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure_reason: Option<LibraryRefreshFailureReason>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryDocumentQuery {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_by: Option<LibrarySortBy>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_direction: Option<LibrarySortDirection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keyword: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryNodeIndexItem {
    pub document_id: String,
    pub node_id: String,
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checked: Option<bool>,
    pub path: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum LibraryMatchedField {
    Title,
    Content,
    Note,
    Tag,
}

pub type LibrarySearchMatchSource = LibraryMatchedField;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryHighlightRange {
    pub start: u32,
    pub end: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum LibraryLocationSource {
    Document,
    Search,
    Task,
    Tag,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryLocation {
    pub document_id: String,
    pub document_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub node_id: Option<String>,
    pub path: Vec<String>,
    pub source: LibraryLocationSource,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibrarySearchResult {
    pub document_id: String,
    pub document_title: String,
    pub document_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub document_status: Option<LibraryDocumentStatus>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub node_id: Option<String>,
    pub text: String,
    pub path: Vec<String>,
    pub match_sources: Vec<LibrarySearchMatchSource>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub highlight_ranges: Option<Vec<LibraryHighlightRange>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub matched_fields: Option<Vec<LibraryMatchedField>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<LibraryLocation>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibrarySearchQuery {
    pub query: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub document_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub matched_field: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryTagSummary {
    pub tag: String,
    pub document_count: u32,
    pub node_count: u32,
    pub items: Vec<LibraryNodeIndexItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<LibraryLocation>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryTagQuery {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_direction: Option<LibrarySortDirection>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryTaskSummary {
    pub document_id: String,
    pub document_title: String,
    pub document_path: String,
    pub node_id: String,
    pub text: String,
    pub checked: bool,
    pub path: Vec<String>,
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub document_status: Option<LibraryDocumentStatus>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<LibraryLocation>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryTaskQuery {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checked: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum LibraryGraphDirection {
    Incoming,
    Outgoing,
    Both,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryGraphQuery {
    pub document_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub direction: Option<LibraryGraphDirection>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryGraphNode {
    pub document_id: String,
    pub title: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<LibraryDocumentStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryGraphEdge {
    pub reference_id: String,
    pub source_document_id: String,
    pub source_node_id: String,
    pub source_occurrence: u32,
    pub target_document_id: String,
    pub target_path: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryGraphResult {
    pub root_document_id: String,
    pub nodes: Vec<LibraryGraphNode>,
    pub edges: Vec<LibraryGraphEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryBacklinkItem {
    pub reference_id: String,
    pub source_document_id: String,
    pub source_document_title: String,
    pub source_document_path: String,
    pub source_document_status: LibraryDocumentStatus,
    pub source_node_id: String,
    pub source_node_text: String,
    pub source_node_path: Vec<String>,
    pub source_occurrence: u32,
    pub target_document_id: String,
    pub target_path: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum LibraryRefreshJobStatus {
    Queued,
    Running,
    CancelRequested,
    Cancelled,
    Completed,
    CompletedWithErrors,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryRefreshErrorItem {
    pub document_id: String,
    pub path: String,
    pub status: LibraryDocumentStatus,
    pub reason: LibraryRefreshFailureReason,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub technical_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryRefreshStatus {
    pub job_id: String,
    pub status: LibraryRefreshJobStatus,
    pub total: u32,
    pub processed: u32,
    pub succeeded: u32,
    pub failed: u32,
    pub skipped: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<u64>,
    pub cancelled: bool,
    pub errors: Vec<LibraryRefreshErrorItem>,
    pub started_at: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finished_at: Option<u64>,
}
