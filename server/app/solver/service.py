"""求解器对外的唯一接口。

设计约定 (见 ARCHITECTURE.md / 技术选型说明.md):
    - 纯函数式接口 ``solve(request) -> PackResult``，内部实现可替换 (py3dbp / 自定义元启发式)。
    - 时间受限近优 (默认 2~3s)，3D 装箱为 NP-hard，不追求真正最优。
    - **绝不**在 API 请求线程内同步计算；由进程池 / Celery worker 执行。
    - 结果按 "商品集合 + 箱体" 为 key 缓存到 Redis。

Phase 3 落地实现。
"""

from __future__ import annotations

from app.contract.packing_contract import PackRequest, PackResult


def solve(request: PackRequest) -> PackResult:
    """时间受限的 3D 装箱近优求解。Phase 3 实现。"""
    raise NotImplementedError("solver 将在 Phase 3 实现")
