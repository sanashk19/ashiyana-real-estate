import pytest
import httpx


@pytest.mark.asyncio
async def test_properties_list_and_search(async_client: httpx.AsyncClient):
    res = await async_client.get("/api/properties")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "results" in data
    assert data["total"] > 0
    assert len(data["results"]) > 0

    first_prop = data["results"][0]
    prop_id = first_prop["id"]

    # Detail lookup
    detail_res = await async_client.get(f"/api/properties/{prop_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == prop_id
    assert "title" in detail_data

    # Search filter by locality
    loc_res = await async_client.get(f"/api/properties?locality={first_prop['locality']}")
    assert loc_res.status_code == 200
    assert loc_res.json()["total"] >= 1
