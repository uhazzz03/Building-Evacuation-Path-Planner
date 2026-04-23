#pragma once
#include <stdint.h>

#ifdef _WIN32
    #define EXTERN extern "C" __declspec(dllexport)
#else
    #define EXTERN extern "C" __attribute__((visibility("default")))
#endif

struct EXPoint { int32_t x; int32_t y; };

EXTERN int32_t ex_find_path_stub(EXPoint start, EXPoint goal, EXPoint* outPath, int32_t maxPathLen);

EXTERN int32_t ex_find_path_grid(const uint8_t* grid, int32_t width, int32_t height, EXPoint start, EXPoint goal, EXPoint* outPath, int32_t maxPathLen);

EXTERN int32_t ex_find_path_multi_goal(const uint8_t* grid, int32_t width, int32_t height, EXPoint start, const EXPoint* goals, int32_t goalCount, EXPoint* outPath, int32_t maxPathLen);