use std::collections::BTreeMap;

use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::{
    models::{
        LibraryBacklinkItem, LibraryGraphDirection, LibraryGraphEdge,
        LibraryGraphNode, LibraryGraphQuery, LibraryGraphResult,
    },
    utils::error::{AppError, AppResult},
};

use super::codec::{db_error, decode_path, status_from_db};

pub(crate) fn backlinks(
    conn: &Connection,
    target_document_id: &str,
) -> AppResult<Vec<LibraryBacklinkItem>> {
    let document_id = target_document_id.trim();
    if document_id.is_empty() {
        return Err(AppError::Validation("documentId 不能为空".to_string()));
    }

    let mut stmt = conn
        .prepare(
            "SELECT r.reference_id,
                    d.document_id, d.title, d.path, d.status,
                    n.node_id, n.text, n.parent_path,
                    r.source_occurrence, r.target_document_id, r.target_path, r.label
             FROM library_document_references r
             JOIN library_documents d ON d.document_id = r.source_document_id
             JOIN library_nodes n
               ON n.document_id = r.source_document_id AND n.node_id = r.source_node_id
             WHERE r.target_document_id = ?1
             ORDER BY lower(d.title), n.parent_path, r.source_occurrence, r.reference_id",
        )
        .map_err(db_error)?;
    let rows = stmt
        .query_map(params![document_id], |row| {
            let status: String = row.get(4)?;
            let path: String = row.get(7)?;
            Ok(LibraryBacklinkItem {
                reference_id: row.get(0)?,
                source_document_id: row.get(1)?,
                source_document_title: row.get(2)?,
                source_document_path: row.get(3)?,
                source_document_status: status_from_db(&status),
                source_node_id: row.get(5)?,
                source_node_text: row.get(6)?,
                source_node_path: decode_path(&path),
                source_occurrence: row.get(8)?,
                target_document_id: row.get(9)?,
                target_path: row.get(10)?,
                label: row.get(11)?,
            })
        })
        .map_err(db_error)?;

    rows.collect::<Result<Vec<_>, _>>().map_err(db_error)
}

pub(crate) fn query_graph(
    conn: &Connection,
    query: LibraryGraphQuery,
) -> AppResult<LibraryGraphResult> {
    let document_id = query.document_id.trim().to_string();
    if document_id.is_empty() {
        return Err(AppError::Validation("documentId 不能为空".to_string()));
    }

    let direction = query.direction.unwrap_or(LibraryGraphDirection::Both);
    let edges = query_edges(conn, &document_id, direction)?;
    let mut nodes = BTreeMap::<String, LibraryGraphNode>::new();

    if let Some(root) = document_node(conn, &document_id)? {
        nodes.insert(root.document_id.clone(), root);
    }

    for edge in &edges {
        if !nodes.contains_key(&edge.source_document_id) {
            if let Some(source) = document_node(conn, &edge.source_document_id)? {
                nodes.insert(source.document_id.clone(), source);
            }
        }
        if !nodes.contains_key(&edge.target_document_id) {
            let target = document_node(conn, &edge.target_document_id)?.unwrap_or_else(|| {
                LibraryGraphNode {
                    document_id: edge.target_document_id.clone(),
                    title: edge.label.clone(),
                    path: edge.target_path.clone(),
                    status: None,
                }
            });
            nodes.insert(target.document_id.clone(), target);
        }
    }

    Ok(LibraryGraphResult {
        root_document_id: document_id,
        nodes: nodes.into_values().collect(),
        edges,
    })
}

fn query_edges(
    conn: &Connection,
    document_id: &str,
    direction: LibraryGraphDirection,
) -> AppResult<Vec<LibraryGraphEdge>> {
    let predicate = match direction {
        LibraryGraphDirection::Incoming => "r.target_document_id = ?1",
        LibraryGraphDirection::Outgoing => "r.source_document_id = ?1",
        LibraryGraphDirection::Both => {
            "(r.source_document_id = ?1 OR r.target_document_id = ?1)"
        }
    };
    let sql = format!(
        "SELECT r.reference_id, r.source_document_id, r.source_node_id,
                r.source_occurrence, r.target_document_id, r.target_path, r.label
         FROM library_document_references r
         WHERE {predicate}
         ORDER BY r.source_document_id, r.source_node_id, r.source_occurrence, r.reference_id"
    );
    let mut stmt = conn.prepare(&sql).map_err(db_error)?;
    let rows = stmt
        .query_map(params![document_id], read_graph_edge)
        .map_err(db_error)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(db_error)
}

fn read_graph_edge(row: &Row<'_>) -> rusqlite::Result<LibraryGraphEdge> {
    Ok(LibraryGraphEdge {
        reference_id: row.get(0)?,
        source_document_id: row.get(1)?,
        source_node_id: row.get(2)?,
        source_occurrence: row.get(3)?,
        target_document_id: row.get(4)?,
        target_path: row.get(5)?,
        label: row.get(6)?,
    })
}

fn document_node(conn: &Connection, document_id: &str) -> AppResult<Option<LibraryGraphNode>> {
    conn.query_row(
        "SELECT document_id, title, path, status
         FROM library_documents
         WHERE document_id = ?1",
        params![document_id],
        |row| {
            let status: String = row.get(3)?;
            Ok(LibraryGraphNode {
                document_id: row.get(0)?,
                title: row.get(1)?,
                path: row.get(2)?,
                status: Some(status_from_db(&status)),
            })
        },
    )
    .optional()
    .map_err(db_error)
}
