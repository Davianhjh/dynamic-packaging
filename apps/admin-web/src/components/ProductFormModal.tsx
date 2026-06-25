import { UploadOutlined } from "@ant-design/icons";
import { Button, Form, Input, InputNumber, Modal, Select, Space, Upload, message } from "antd";
import { useEffect, useMemo, useState } from "react";

import { createProduct, updateProduct, uploadThumbnail } from "../api/catalog";
import { ApiError } from "../api/client";
import type { AdminProduct, ProductStatus } from "../api/types";

interface Props {
  open: boolean;
  product: AdminProduct | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  name: string;
  length: number;
  width: number;
  height: number;
  stock: number;
  status: ProductStatus;
}

function errText(err: unknown): string {
  return err instanceof ApiError ? err.message : "操作失败";
}

export default function ProductFormModal({ open, product, onClose, onSaved }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  // 新建时商品尚无 id，先暂存所选图片，保存后再上传。
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setPendingFile(null);
    if (product) {
      form.setFieldsValue({
        name: product.name,
        length: product.dimensions.length,
        width: product.dimensions.width,
        height: product.dimensions.height,
        stock: product.stock,
        status: product.status,
      });
    } else {
      form.resetFields();
    }
  }, [open, product, form]);

  const previewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile],
  );
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const onOk = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        name: v.name,
        dimensions: { length: v.length, width: v.width, height: v.height },
        stock: v.stock,
        status: v.status,
      };
      const saved = product
        ? await updateProduct(product.id, payload)
        : await createProduct(payload);
      if (pendingFile) await uploadThumbnail(saved.id, pendingFile);
      message.success("已保存");
      onSaved();
    } catch (err) {
      message.error(errText(err));
    } finally {
      setSaving(false);
    }
  };

  const thumb = previewUrl ?? product?.thumbnailUrl ?? null;

  return (
    <Modal
      open={open}
      title={product ? "编辑商品" : "新建商品"}
      onCancel={onClose}
      onOk={onOk}
      confirmLoading={saving}
      forceRender
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ stock: 0, status: "offline" }}>
        <Form.Item name="name" label="名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Space size="middle">
          <Form.Item name="length" label="长 (mm)" rules={[{ required: true }]}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item name="width" label="宽 (mm)" rules={[{ required: true }]}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item name="height" label="高 (mm)" rules={[{ required: true }]}>
            <InputNumber min={1} />
          </Form.Item>
        </Space>
        <Form.Item name="stock" label="库存" rules={[{ required: true }]}>
          <InputNumber min={0} />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select
            options={[
              { value: "offline", label: "下架" },
              { value: "online", label: "上架" },
            ]}
          />
        </Form.Item>
        <Form.Item label="缩略图">
          <Upload
            accept="image/*"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => {
              setPendingFile(file);
              return false; // 不立即上传，保存时再传
            }}
          >
            <Button icon={<UploadOutlined />}>选择本地图片</Button>
          </Upload>
          {thumb ? (
            <img
              src={thumb}
              alt=""
              style={{
                marginTop: 8,
                width: 64,
                height: 64,
                objectFit: "cover",
                borderRadius: 4,
              }}
            />
          ) : null}
          {pendingFile ? (
            <div style={{ marginTop: 4, fontSize: 12, color: "#888" }}>
              {pendingFile.name}（保存后上传）
            </div>
          ) : null}
        </Form.Item>
      </Form>
    </Modal>
  );
}
