from decimal import Decimal
from typing import Annotated

from pydantic import Field

PositiveMoney = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2, allow_inf_nan=False)]
NonnegativeMoney = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2, allow_inf_nan=False)]
