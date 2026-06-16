import {
  Button,
  Image,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
  type TableColumnsType,
} from "antd";
import { useEffect, useState } from "react";

import { deleteProduct, listProducts, setStatus } from "../api/catalog";
import { ApiError } from "../api/client";
import type { AdminProduct } from "../api/types";
import ProductFormModal from "../components/ProductFormModal";

function errText(err: unknown): string {
  return err instanceof ApiError ? err.message : "请求失败";
}

export default function ProductsPage() {
  const [data, setData] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      setData(await listProducts());
    } catch (err) {
      message.error(errText(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const onToggle = async (p: AdminProduct, online: boolean) => {
    try {
      await setStatus(p.id, online ? "online" : "offline");
      void reload();
    } catch (err) {
      message.error(errText(err));
    }
  };

  const onDelete = async (p: AdminProduct) => {
    try {
      await deleteProduct(p.id);
      message.success("已删除");
      void reload();
    } catch (err) {
      message.error(errText(err));
    }
  };

  const columns: TableColumnsType<AdminProduct> = [
    {
      title: "缩略图",
      dataIndex: "thumbnailUrl",
      width: 88,
      render: (url: string | null) =>
        url ? (
          <Image src={url} width={48} height={48} style={{ objectFit: "cover" }} />
        ) : (
          <span style={{ color: "#bbb" }}>—</span>
        ),
    },
    { title: "名称", dataIndex: "name" },
    {
      title: "尺寸 (mm)",
      render: (_, p) => `${p.dimensions.length}×${p.dimensions.width}×${p.dimensions.height}`,
    },
    { title: "库存", dataIndex: "stock", width: 90 },
    {
      title: "状态",
      dataIndex: "status",
      width: 130,
      render: (status: string, p) => (
        <Space>
          <Switch checked={status === "online"} onChange={(v) => onToggle(p, v)} />
          <Tag color={status === "online" ? "green" : "default"}>
            {status === "online" ? "上架" : "下架"}
          </Tag>
        </Space>
      ),
    },
    {
      title: "操作",
      width: 170,
      render: (_, p) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditing(p);
              setModalOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm title="确认删除该商品?" onConfirm={() => onDelete(p)}>
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          商品管理
        </Typography.Title>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          新建商品
        </Button>
      </div>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} />
      <ProductFormModal
        open={modalOpen}
        product={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          void reload();
        }}
      />
    </div>
  );
}
