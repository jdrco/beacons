from typing import Type, TypeVar, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

ModelType = TypeVar("ModelType")

def filter_query(
    db: Session,
    model: Type[ModelType],
    filters: Optional[List[Any]] = None,
    order_by: Optional[List] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    join_models: Optional[List[Type[ModelType]]] = None
) -> List[ModelType]:

    query_obj = db.query(model)

    if join_models:
        for join_model in join_models:
            query_obj = query_obj.join(join_model)

    if filters:
        query_obj = query_obj.filter(and_(*filters))

    if order_by:
        query_obj = query_obj.order_by(*order_by)

    if limit is not None:
        query_obj = query_obj.limit(limit)
    if offset is not None:
        query_obj = query_obj.offset(offset)

    return query_obj.all()
