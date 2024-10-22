import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useNodeModules } from "./hooks/useNodeModules";
import { useMemo, useState, useCallback } from "react";
import fsExtra from "fs-extra";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { formatSize } from "./utils/format";

const execPromise = promisify(exec);

export type NodeModulesItem = {
  id: string;
  title: string;
  lastModified: Date;
  size: number;
};

export default function Command() {
  const { items, loading, pagination } = useNodeModules();
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const [sortWith, setSortWith] = useState<"size" | "lastModified">("lastModified");

  const handleDelete = useCallback(async (id: string, path: string) => {
    try {
      if (deletingItems.has(id)) {
        return;
      }
      setDeletingItems((prev) => new Set(prev).add(id));
      await fsExtra.remove(path);
      setDeletedItems((prev) => new Set(prev).add(id));
      await showToast({
        style: Toast.Style.Success,
        title: "Deleted successfully",
        message: path,
      });
    } catch (error) {
      console.error(`Error deleting ${path}:`, error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete",
        message: path,
      });
    }
  }, []);

  const handleGoToFolder = useCallback(async (nodePath: string) => {
    try {
      const parentPath = path.dirname(nodePath);
      await execPromise(`open "${parentPath}"`);
    } catch (error) {
      console.error(`Error opening folder ${nodePath}:`, error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed To Open Folder",
        message: nodePath,
      });
    }
  }, []);

  const sortedItems = useMemo(() => {
    const filteredItems = items.filter((item) => !deletedItems.has(item.id));
    if (sortWith === "lastModified") {
      return filteredItems.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    } else {
      return filteredItems.sort((a, b) => b.size - a.size);
    }
  }, [items, deletedItems, sortWith]);

  return (
    <List
      isLoading={loading}
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown tooltip={"Order By"} onChange={(value) => setSortWith(value as "size" | "lastModified")}>
          <List.Dropdown.Item title="Last Modified" value="lastModified" />
          <List.Dropdown.Item title="Size" value="size" />
        </List.Dropdown>
      }
    >
      {sortedItems.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={`Size: ${formatSize(item.size)} | Last modified: ${item.lastModified.toLocaleString()}`}
          icon={deletingItems.has(item.id) ? Icon.Dot : Icon.Trash}
          actions={
            <ActionPanel>
              <Action
                title="Delete Node_modules"
                icon={Icon.Trash}
                onAction={() => handleDelete(item.id, item.title)}
              />
              <Action title="Go to Parent Folder" icon={Icon.Finder} onAction={() => handleGoToFolder(item.title)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
