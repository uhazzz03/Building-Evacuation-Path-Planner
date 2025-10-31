#include "evacuatex_native.h"

int32_t ex_find_path_stub(EXPoint start, EXPoint goal, EXPoint* outPath, int32_t maxPathLen)
{
    if (!outPath || maxPathLen <=0)
    {
        return -1;
    }

    int32_t n=0;

    int dx = (goal.x >= start.x) ? 1: -1;
    for (int x = start.x; x != goal.x && n < maxPathLen; x += dx)
        outPath[n++] = { x, start.y };
    if (n < maxPathLen) outPath[n++] = { goal.x, start.y };

    int dy = (goal.y >= start.y) ? 1 : -1;
    for (int y = start.y; y != goal.y && n < maxPathLen; y += dy)
        outPath[n++] = { goal.x, y };
    if (n < maxPathLen) outPath[n++] = { goal.x, goal.y };

    return n;
}

int32_t ex_find_path_grid(const uint8_t*grid, int32_t width, int32_t height, EXPoint start, EXPoint goal, EXPoint* outPath, int32_t maxPathLen)
{
    if (!grid || !outPath || maxPathLen <= 0) return 0;

    //Replace with A* here later.

    int32_t count = 0;
    if (count < maxPathLen) outPath[count++] = start;
    if (count < maxPathLen) outPath[count++] = goal;
    return count;
}