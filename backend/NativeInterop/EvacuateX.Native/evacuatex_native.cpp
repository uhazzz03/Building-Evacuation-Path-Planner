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