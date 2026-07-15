cmake_minimum_required(VERSION 3.16)

project({{{ProjectName}}})

set(CMAKE_CXX_STANDARD {{{CppVerison}}})  #11 17 20 ,98 03 14 23
set(CMAKE_C_STANDARD {{{CVerison}}})    #11 17 23 ,90 99

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG   ${CMAKE_SOURCE_DIR}/Run)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE ${CMAKE_SOURCE_DIR}/Run)

set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable({{{ProjectName}}} main.cpp)