#include <assert.h>
#include <node_api.h>

static napi_value
bare_addon_exports (napi_env env, napi_value exports) {
  int err;

  err = napi_create_uint32(env, 42, &exports);
  assert(err == 0);

  return exports;
}

NAPI_MODULE(bare_addon, bare_addon_exports)
