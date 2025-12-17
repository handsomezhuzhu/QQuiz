import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'

const Pagination = ({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50, 100]
}) => {
    const totalPages = Math.ceil(totalItems / pageSize)
    const [inputPage, setInputPage] = useState(currentPage)

    useEffect(() => {
        setInputPage(currentPage)
    }, [currentPage])

    const handlePageSubmit = (e) => {
        e.preventDefault()
        let page = parseInt(inputPage)
        if (isNaN(page)) page = 1
        if (page < 1) page = 1
        if (page > totalPages) page = totalPages
        onPageChange(page)
        setInputPage(page)
    }

    if (totalItems === 0) return null

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-gray-100 mt-4">
            {/* Info */}
            <div className="text-sm text-gray-500">
                显示 {Math.min((currentPage - 1) * pageSize + 1, totalItems)} - {Math.min(currentPage * pageSize, totalItems)} 共 {totalItems} 条
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                {/* Page Size Selector */}
                <div className="relative group">
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer hover:border-gray-400 transition-colors"
                    >
                        {pageSizeOptions.map(size => (
                            <option key={size} value={size}>{size} 条/页</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    {/* Manual Input */}
                    <form onSubmit={handlePageSubmit} className="flex items-center">
                        <input
                            type="text"
                            value={inputPage}
                            onChange={(e) => setInputPage(e.target.value)}
                            className="w-12 text-center py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent mx-1"
                        />
                        <span className="text-gray-500 text-sm mx-1">/ {totalPages}</span>
                    </form>

                    <button
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Pagination
