from app.utils import parse_object_id, parse_object_ids, safe_name, to_camel_case


def test_to_camel_case():
    assert to_camel_case("hello_world") == "helloWorld"
    assert to_camel_case("user_id") == "userId"
    assert to_camel_case("simple") == "simple"
    assert to_camel_case("a_b_c_d") == "aBCD"


def test_parse_object_id_invalid():
    assert parse_object_id(None) is None
    assert parse_object_id("") is None
    assert parse_object_id("not-an-id") is None


def test_parse_object_id_valid():
    oid = parse_object_id("507f1f77bcf86cd799439011")
    assert oid is not None


def test_parse_object_ids_filters_invalid():
    out = parse_object_ids(["507f1f77bcf86cd799439011", "garbage", ""])
    assert len(out) == 1


def test_safe_name():
    assert safe_name("My Warmup 1")
    assert safe_name("hello-world_2")
    assert not safe_name("")
    assert not safe_name("bad/name")
    assert not safe_name("x" * 100)
