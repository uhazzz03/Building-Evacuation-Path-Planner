cmake_minimum_required(VERSION 3.22)
project(EvacuateX.Native LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
add_library(EvacuateX.Native SHARED evacuatex_native.cpp)