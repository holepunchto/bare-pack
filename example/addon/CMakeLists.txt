cmake_minimum_required(VERSION 3.25)

find_package(cmake-bare REQUIRED PATHS node_modules/cmake-bare)
find_package(cmake-napi REQUIRED PATHS node_modules/cmake-napi)

project(bare_addon C)

add_bare_module(bare_addon)

target_sources(
  ${bare_addon}
  PRIVATE
    binding.c
)

add_napi_module(bare_addon_napi)

target_sources(
  ${bare_addon_napi}
  PRIVATE
    binding.c
)
